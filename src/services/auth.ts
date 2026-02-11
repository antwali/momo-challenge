import { prisma } from "../db";
import { getOrCreateMainAccount } from "./accounts";
import { sendNotification } from "./notification";

export type RegisterInput = {
  phoneNumber: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string; // ISO date
};

/**
 * Register a new user and create main wallet (account).
 * Phone number is unique identifier; indexed for fast lookup at scale.
 */
export async function register(input: RegisterInput) {
  const normalizedPhone = input.phoneNumber.replace(/\s+/g, "").trim();
  const existing = await prisma.user.findUnique({
    where: { phoneNumber: normalizedPhone },
  });
  if (existing) {
    throw new Error("User with this phone number already exists.");
  }

  const user = await prisma.user.create({
    data: {
      phoneNumber: normalizedPhone,
      fullName: input.fullName,
      gender: input.gender ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      kycStatus: "PENDING",
    },
  });

  const account = await getOrCreateMainAccount(user.id);

  await sendNotification({
    channel: "sms",
    to: normalizedPhone,
    message: `Welcome to Momo Wallet. Your account is ready.`,
  }).catch(() => {});

  return {
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      kycStatus: user.kycStatus,
    },
    mainAccountId: account.id,
  };
}
