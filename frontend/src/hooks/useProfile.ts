import { useEffect, useState } from "react";
import { request } from "../api/request";
export interface Profile {
  userId: number;
  username: string;
  role: "USER" | "ADMIN";
}
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request
      .get<Profile>("/api/auth/me")
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return { profile, error };
}
