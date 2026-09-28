import { describe, expect, it } from "vitest"
import { buildFormAnswer } from "./facade"
import type { V2FormField } from "./types"

describe("buildFormAnswer", () => {
  it("maps the selected labels back to the field values", () => {
    const fields: V2FormField[] = [
      { key: "q1", type: "string", options: [{ value: "a", label: "选项A" }, { value: "b", label: "选项B" }] },
      { key: "q2", type: "multiselect", options: [{ value: "x", label: "X" }, { value: "y", label: "Y" }] },
    ]

    expect(buildFormAnswer(fields, [["选项B"], ["X", "Y"]])).toEqual({ q1: "b", q2: ["x", "y"] })
  })

  it("keeps free-form input and coerces the declared field types", () => {
    const fields: V2FormField[] = [
      { key: "count", type: "integer" },
      { key: "confirm", type: "boolean" },
      { key: "note", type: "string" },
    ]

    expect(buildFormAnswer(fields, [["42"], ["yes"], ["自定义回答"]])).toEqual({
      count: 42,
      confirm: true,
      note: "自定义回答",
    })
  })

  it("omits fields the user did not answer", () => {
    expect(buildFormAnswer([{ key: "q1", type: "string" }], [[]])).toEqual({})
  })
})
