"use client";

import { useEffect } from "react";
import { initializeAnalytics } from "../lib/firebase";

export default function FirebaseAnalytics() {
  useEffect(() => {
    void initializeAnalytics();
  }, []);

  return null;
}
