import { prisma } from "../db";

export type OnboardMerchantInput = {
  phoneNumber: string;
  businessName: string;
  categoryCode: string;
};

/**
 * Create a user + MERCHANT account + merchant profile for testing merchant payments.
 * In production you’d have separate KYC/onboarding flows.
 */
export async function onboardMerchant(input: OnboardMerchantInput) {
  const category = await prisma.merchantCategory.findUnique({
    where: { code: input.categoryCode },
  });
  if (!category) {
    throw new Error(`Category ${input.categoryCode} not found. Run db:seed.`);
  }

  const phone = input.phoneNumber.replace(/\s+/g, "").trim();
  const existing = await prisma.user.findUnique({
    where: { phoneNumber: phone },
    include: { accounts: { where: { type: "MERCHANT" } } },
  });
  if (existing?.accounts?.length) {
    throw new Error("User already has a merchant account.");
  }

  const user = await prisma.user.upsert({
    where: { phoneNumber: phone },
    create: {
      phoneNumber: phone,
      fullName: input.businessName,
      kycStatus: "PENDING",
    },
    update: {},
  });

  const account = await prisma.account.create({
    data: { userId: user.id, type: "MERCHANT", currency: "RWF" },
  });

  const profile = await prisma.merchantProfile.create({
    data: {
      accountId: account.id,
      categoryId: category.id,
      businessName: input.businessName,
    },
  });

  return {
    userId: user.id,
    accountId: account.id,
    merchantProfileId: profile.id,
    categoryCode: category.code,
  };
}
