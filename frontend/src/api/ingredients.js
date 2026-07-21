import client from "./client";

export async function getIngredients() {
  const response = await client.get("/ingredients/");
  return response.data;
}

export async function createIngredient(data) {
  const response = await client.post("/ingredients/", data);
  return response.data;
}

export async function deleteIngredient(id) {
  const response = await client.delete(`/ingredients/${id}`);
  return response.data;
}
