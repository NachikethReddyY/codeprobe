export async function exchangeGitHubToken(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = (await res.json()) as { access_token?: string; error?: string };
    return data.access_token || null;
  } catch (e) {
    console.error("OAuth exchange failed:", e);
    return null;
  }
}

export async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
