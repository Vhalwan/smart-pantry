import client from "./client";

export async function getRecipes() {
  const response = await client.get("/recipes/");
  return response.data;
}

export async function createRecipe(data) {
  const response = await client.post("/recipes/", data);
  return response.data;
}

export async function deleteRecipe(id) {
  const response = await client.delete(`/recipes/${id}`);
  return response.data;
}

export async function cookRecipe(id) {
  const response = await client.post(`/recipes/${id}/cook`);
  return response.data;
}
