import { describe, expect, it } from "vitest";
import { canCreateMeeting, canEditBoard, canEditReport, canPostMessage, canReadTalent } from "./access";

const gestor = { id: "g1", role: "gestor" as const };
const alan = { id: "t1", role: "talento" as const };
const outro = { id: "t2", role: "talento" as const };

describe("acesso do talento e do gestor", () => {
  it("gestor lê qualquer talento e o talento só lê a si", () => {
    expect(canReadTalent(gestor, alan.id)).toBe(true);
    expect(canReadTalent(alan, alan.id)).toBe(true);
    expect(canReadTalent(alan, outro.id)).toBe(false);
  });

  it("gestor e o próprio talento editam o quadro; o relatório fica com o talento", () => {
    expect(canEditBoard(alan, alan.id)).toBe(true);
    expect(canEditBoard(gestor, alan.id)).toBe(true);
    expect(canEditBoard(outro, alan.id)).toBe(false);
    expect(canEditReport(outro, alan.id)).toBe(false);
  });

  it("talento escreve recado no próprio fio e o gestor escreve feedback", () => {
    expect(canPostMessage(alan, alan.id)).toBe(true);
    expect(canPostMessage(alan, outro.id)).toBe(false);
    expect(canPostMessage(gestor, alan.id)).toBe(true);
  });

  it("só o gestor marca reunião", () => {
    expect(canCreateMeeting(gestor)).toBe(true);
    expect(canCreateMeeting(alan)).toBe(false);
  });
});
