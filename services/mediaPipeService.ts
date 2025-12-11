import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | undefined;
let runningMode: "IMAGE" | "VIDEO" = "VIDEO";

export const createHandLandmarker = async (): Promise<HandLandmarker> => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 1
  });
  
  return handLandmarker;
};

export const detectHands = (video: HTMLVideoElement, timestamp: number): HandLandmarkerResult | null => {
  if (!handLandmarker) return null;
  return handLandmarker.detectForVideo(video, timestamp);
};
