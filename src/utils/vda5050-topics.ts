import { VALID_TOPIC_TYPES } from "@/types/mqtt.types";

// Utility function to check if a topic is a valid VDA5050 topic
export function isValidVDA5050Topic(topic: string): boolean {
  return VALID_TOPIC_TYPES.some((type) => topic.includes(type));
}

// Utility function to build subscription topics for a given interface name
export function buildVDA5050Topics(interfaceName: string = "+"): string[] {
  return VALID_TOPIC_TYPES.map(
    (topicType) => `${interfaceName}/+/+/+${topicType}`
  );
}
