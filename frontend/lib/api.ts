const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function getPlanningSummary() {
  const res = await fetch(`${API_BASE}/api/planning/summary`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load planning summary");
  }

  return res.json();
}

export async function getBreederFlockPlans() {
  const res = await fetch(`${API_BASE}/api/planning/breeder-flock-plans`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load breeder flock plans");
  }

  return res.json();
}

export async function createBreederFlockPlan(payload: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/api/planning/breeder-flock-plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create breeder flock plan");
  }

  return response.json();
}