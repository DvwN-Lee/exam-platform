import { describe, it, expect, beforeEach } from "vitest";
import { useSidebarStore } from "@/stores/sidebarStore";

describe("useSidebarStore", () => {
  beforeEach(() => {
    useSidebarStore.setState({
      isOpen: false,
      isCollapsed: false,
    });
  });

  describe("초기 상태", () => {
    it("기본 상태값이 올바르다", () => {
      const state = useSidebarStore.getState();

      expect(state.isOpen).toBe(false);
      expect(state.isCollapsed).toBe(false);
    });
  });

  describe("toggle", () => {
    it("닫힌 상태에서 열린 상태로 전환한다", () => {
      const { toggle } = useSidebarStore.getState();

      toggle();

      expect(useSidebarStore.getState().isOpen).toBe(true);
    });

    it("열린 상태에서 닫힌 상태로 전환한다", () => {
      useSidebarStore.setState({ isOpen: true });
      const { toggle } = useSidebarStore.getState();

      toggle();

      expect(useSidebarStore.getState().isOpen).toBe(false);
    });

    it("연속 호출 시 상태가 번갈아 변경된다", () => {
      const { toggle } = useSidebarStore.getState();

      toggle();
      expect(useSidebarStore.getState().isOpen).toBe(true);

      toggle();
      expect(useSidebarStore.getState().isOpen).toBe(false);

      toggle();
      expect(useSidebarStore.getState().isOpen).toBe(true);
    });
  });

  describe("open", () => {
    it("사이드바를 연다", () => {
      const { open } = useSidebarStore.getState();

      open();

      expect(useSidebarStore.getState().isOpen).toBe(true);
    });

    it("이미 열린 상태에서 호출해도 열린 상태를 유지한다", () => {
      useSidebarStore.setState({ isOpen: true });
      const { open } = useSidebarStore.getState();

      open();

      expect(useSidebarStore.getState().isOpen).toBe(true);
    });
  });

  describe("close", () => {
    it("사이드바를 닫는다", () => {
      useSidebarStore.setState({ isOpen: true });
      const { close } = useSidebarStore.getState();

      close();

      expect(useSidebarStore.getState().isOpen).toBe(false);
    });

    it("이미 닫힌 상태에서 호출해도 닫힌 상태를 유지한다", () => {
      const { close } = useSidebarStore.getState();

      close();

      expect(useSidebarStore.getState().isOpen).toBe(false);
    });
  });

  describe("setCollapsed", () => {
    it("collapsed 상태를 true로 설정한다", () => {
      const { setCollapsed } = useSidebarStore.getState();

      setCollapsed(true);

      expect(useSidebarStore.getState().isCollapsed).toBe(true);
    });

    it("collapsed 상태를 false로 설정한다", () => {
      useSidebarStore.setState({ isCollapsed: true });
      const { setCollapsed } = useSidebarStore.getState();

      setCollapsed(false);

      expect(useSidebarStore.getState().isCollapsed).toBe(false);
    });

    it("isOpen 상태에 영향을 주지 않는다", () => {
      useSidebarStore.setState({ isOpen: true });
      const { setCollapsed } = useSidebarStore.getState();

      setCollapsed(true);

      const state = useSidebarStore.getState();
      expect(state.isCollapsed).toBe(true);
      expect(state.isOpen).toBe(true);
    });
  });

  describe("상태 독립성", () => {
    it("isOpen과 isCollapsed는 독립적으로 동작한다", () => {
      const { toggle, setCollapsed } = useSidebarStore.getState();

      toggle();
      setCollapsed(true);

      const state = useSidebarStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.isCollapsed).toBe(true);
    });

    it("open/close는 isCollapsed에 영향을 주지 않는다", () => {
      useSidebarStore.setState({ isCollapsed: true });
      const { open, close } = useSidebarStore.getState();

      open();
      expect(useSidebarStore.getState().isCollapsed).toBe(true);

      close();
      expect(useSidebarStore.getState().isCollapsed).toBe(true);
    });
  });
});
