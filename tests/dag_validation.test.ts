import { describe, expect, test } from "vitest";
import { validateWorkflow } from "../src/services/dag_validation";

describe("validateWorkflow", () => {
  test("returns a dependency-respecting order for a valid three-job chain", () => {
    const result = validateWorkflow([
      { client_id: "report", type: "generate_report" },
      {
        client_id: "upload",
        type: "upload_file",
        depends_on: ["report"]
      },
      {
        client_id: "email",
        type: "send_email",
        depends_on: ["upload"]
      }
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.order).toHaveLength(3);
    expect(result.order.indexOf("report")).toBeLessThan(
      result.order.indexOf("upload")
    );
    expect(result.order.indexOf("upload")).toBeLessThan(
      result.order.indexOf("email")
    );
  });

  test("rejects a cycle", () => {
    expect(
      validateWorkflow([
        { client_id: "a", type: "send_email", depends_on: ["b"] },
        { client_id: "b", type: "send_email", depends_on: ["a"] }
      ])
    ).toEqual({ ok: false, error: "cycle detected" });
  });

  test("rejects a self-dependency", () => {
    expect(
      validateWorkflow([
        { client_id: "a", type: "send_email", depends_on: ["a"] }
      ])
    ).toEqual({ ok: false, error: "self-dependency on 'a'" });
  });

  test("rejects an unknown dependency", () => {
    expect(
      validateWorkflow([
        { client_id: "a", type: "send_email", depends_on: ["missing"] }
      ])
    ).toEqual({
      ok: false,
      error: "unknown dependency 'missing' for 'a'"
    });
  });

  test("rejects a duplicate client_id", () => {
    expect(
      validateWorkflow([
        { client_id: "a", type: "generate_report" },
        { client_id: "a", type: "send_email" }
      ])
    ).toEqual({ ok: false, error: "duplicate client_id 'a'" });
  });
});
