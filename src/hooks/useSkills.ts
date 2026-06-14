import { useEffect } from "react";
import { useSkillStore } from "@/stores/skillStore";

export function useSkills() {
  const store = useSkillStore();

  useEffect(() => {
    store.fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
