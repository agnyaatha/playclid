/// <reference lib="webworker" />
import { handleAdvisorRequest } from "./handler";
import type { AdvisorRequest } from "./protocol";

self.onmessage = (e: MessageEvent<AdvisorRequest>) => {
  self.postMessage(handleAdvisorRequest(e.data));
};
