import type { Action, InstantActions } from "vda-5050-lib";

/**
 * The VDA5050 instantActions message carries its actions in the field
 * "actions" (instantActions.schema.json). vda-5050-lib names the field
 * "instantActions", so convert before publishing.
 */
export function toInstantActionsMessage(instantActions: InstantActions) {
  const { instantActions: actions, ...header } = instantActions;
  return { ...header, actions };
}

/** Actions of a received instantActions message (either field name) */
export function instantActionsOf(message: any): Action[] | undefined {
  if (Array.isArray(message?.actions)) return message.actions;
  if (Array.isArray(message?.instantActions)) return message.instantActions;
  return undefined;
}
