  import { testLogin, testRegistration } from "./auth";

describe("Authentication", () => {
  it("should login successfully with valid credentials", async () => {
    const result = await testLogin("user@example.com", "password");
    expect(result.success).toBe(true);
  });

  it("should fail login with invalid credentials", async () => {
    const result = await testLogin("user@example.com", "wrongpassword");
    expect(result.success).toBe(false);
  });

  it("should register successfully with valid data", async () => {
    const result = await testRegistration("newuser@example.com", "password", "New User");
    expect(result.success).toBe(true);
  });

  it("should fail registration with invalid data", async () => {
    const result = await testRegistration("invalidemail", "weak", "");
    expect(result.success).toBe(false);
  });
});