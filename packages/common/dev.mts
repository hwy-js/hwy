interface Logger {
  info(...args: any[]): void;
  warning(...args: any[]): void;
  error(...args: any[]): void;
}

class ColorLogger implements Logger {
  private label: string;

  constructor(label: string) {
    this.label = label;
  }

  private log(level: string, ...args: any[]) {
    let colorCode = "";
    switch (level) {
      case "info":
        colorCode = "\x1b[36m"; // Light blue
        break;
      case "warning":
        colorCode = "\x1b[33m"; // Yellow
        break;
      case "error":
        colorCode = "\x1b[31m"; // Red
        break;
    }

    console.log(
      `${new Date().toLocaleString()}  ${this.label} ${colorCode}`,
      ...args,
      `\x1b[0m`,
    );
  }

  info(...args: any[]) {
    this.log("info", ...args);
  }

  warning(...args: any[]) {
    this.log("warning", ...args);
  }

  error(...args: any[]) {
    this.log("error", ...args);
  }
}

export const hwyLog: Logger = new ColorLogger("Hwy");

export function logPerf(taskName: string, p0: number, p1: number) {
  hwyLog.info(`completed ${taskName} in ${Math.round(p1 - p0).toFixed(0)}ms`);
}
