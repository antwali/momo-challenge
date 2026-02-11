import { sendNotification } from "../../../services/notification";

describe("notification sendNotification", () => {
  const originalEnv = process.env.NOTIFICATION_CHANNEL;

  afterEach(() => {
    process.env.NOTIFICATION_CHANNEL = originalEnv;
  });

  it("logs to console when notificationChannel is console", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await sendNotification({
      channel: "sms",
      to: "250788123456",
      message: "Hello",
    });
    expect(logSpy).toHaveBeenCalledWith("[Notification]", "sms", "->", "250788123456", "Hello");
    logSpy.mockRestore();
  });

  it("does not throw", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(
      sendNotification({ channel: "whatsapp", to: "x", message: "y" })
    ).resolves.toBeUndefined();
    (console.log as jest.Mock).mockRestore();
  });
});
