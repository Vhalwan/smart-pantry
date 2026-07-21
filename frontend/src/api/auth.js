import client from "./client";

export async function register(email, password) {
  const response = await client.post("/auth/register", { email, password });
  return response.data;
}

export async function login(email, password) {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  const response = await client.post("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
}
