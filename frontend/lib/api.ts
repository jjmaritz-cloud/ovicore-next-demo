const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getBreederFlockPlans() {
  const response = await fetch(
    `${API_URL}/api/planning/breeder-flock-plans`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch breeder flock plans");
  }

  return response.json();
}

export async function createBreederFlockPlan(payload: Record<string, unknown>) {
  const response = await fetch(
    `${API_URL}/api/planning/breeder-flock-plans`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create breeder flock plan");
  }

  return response.json();
}