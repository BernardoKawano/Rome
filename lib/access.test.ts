import { describe, expect, it } from "vitest";
import { canCreateMeeting, canEditBoard, canEditReport, canPostMessage, canReadTalent } from "./access";

const gestor = { id: "g1", role: "gestor" as const };
const allan = { id: "t1", role: "talento" as const };
const outro = { id: "t2", role: "talento" as const };

describe("acesso do talento e do gestor", () => {
  it("gestor lê qualquer talento e o talento só lê a si", () => {
    expect(canReadTalent(gestor, allan.id)).toBe(true);
    expect(canReadTalent(allan, allan.id)).toBe(true);
    expect(canReadTalent(allan, outro.id)).toBe(false);
  });

  it("gestor e o próprio talento editam o quadro; o relatório fica com o talento", () => {
    expect(canEditBoard(allan, allan.id)).toBe(true);
    expect(canEditBoard(gestor, allan.id)).toBe(true);
    expect(canEditBoard(outro, allan.id)).toBe(false);
    expect(canEditReport(outro, allan.id)).toBe(false);
  });

  it("talento escreve recado no próprio fio e o gestor escreve feedback", () => {
    expect(canPostMessage(allan, allan.id)).toBe(true);
    expect(canPostMessage(allan, outro.id)).toBe(false);
    expect(canPostMessage(gestor, allan.id)).toBe(true);
  });

  it("só o gestor marca reunião", () => {
    expect(canCreateMeeting(gestor)).toBe(true);
    expect(canCreateMeeting(allan)).toBe(false);
  });
});
