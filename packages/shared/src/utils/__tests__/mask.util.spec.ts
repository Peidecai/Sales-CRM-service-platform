import {
  maskPhone,
  maskIdCard,
  maskEmail,
  maskAddress,
  maskByPattern,
} from "../mask.util";

describe("maskPhone", () => {
  it("should mask normal phone", () => {
    expect(maskPhone("13812345678")).toBe("138****5678");
  });
  it("should return short input unchanged", () => {
    expect(maskPhone("123456")).toBe("123456");
  });
  it("should return empty string unchanged", () => {
    expect(maskPhone("")).toBe("");
  });
});

describe("maskIdCard", () => {
  it("should mask 18-digit ID", () => {
    expect(maskIdCard("330102199001011234")).toBe("3301****1234");
  });
  it("should mask 15-digit ID", () => {
    expect(maskIdCard("330102900101123")).toBe("3301****0123");
  });
  it("should return short input unchanged", () => {
    expect(maskIdCard("1234567")).toBe("1234567");
  });
});

describe("maskEmail", () => {
  it("should mask normal email", () => {
    expect(maskEmail("abcdef@example.com")).toBe("ab***@example.com");
  });
  it("should mask short local part", () => {
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
  });
  it("should return empty unchanged", () => {
    expect(maskEmail("")).toBe("");
  });
  it("should handle no @ sign", () => {
    expect(maskEmail("noemail")).toBe("noemail");
  });
});

describe("maskAddress", () => {
  it("should mask normal address", () => {
    expect(maskAddress("北京市朝阳区建国门外大街1号")).toBe("北京市朝阳区****");
  });
  it("should return short address unchanged", () => {
    expect(maskAddress("北京市")).toBe("北京市");
  });
  it("should return empty unchanged", () => {
    expect(maskAddress("")).toBe("");
  });
});

describe("maskByPattern", () => {
  it("should mask with 3,4,4 pattern", () => {
    expect(maskByPattern("13812345678", "3,4,4")).toBe("138****5678");
  });
  it("should mask with 2,*,0 pattern (hide rest)", () => {
    expect(maskByPattern("abcdefgh", "2,*,0")).toBe("ab******");
  });
  it("should return unchanged for invalid pattern", () => {
    expect(maskByPattern("test", "invalid")).toBe("test");
  });
  it("should return unchanged for short value", () => {
    expect(maskByPattern("ab", "3,4,4")).toBe("ab");
  });
  it("should handle 4,10,4 pattern", () => {
    expect(maskByPattern("330102199001011234", "4,10,4")).toBe(
      "3301**********1234",
    );
  });
});
