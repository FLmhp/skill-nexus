import { useEffect } from "react";
import { useSkillStore } from "@/stores/skillStore";

export function useSkills() {
  const store = useSkillStore();

  useEffect(() => {
    store.fetchSkills();
  }, []);

  return store;
}
