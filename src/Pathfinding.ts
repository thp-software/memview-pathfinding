import { Anchor, KeyCode, MemView, Vector2, Zoom } from "memview";
import { Node } from "./interfaces/Node";
import { Heuristic } from "./enums/Heuristic";

export class Pathfinding {
  // MemView instance to render
  private mem: MemView;

  // Terrain
  private terrainGrid: number[][] = [];
  // Path
  private pathGrid: any[][] = [];
  // Size of the map
  private mapSize: Vector2 = { x: 16, y: 16 };

  // Heuristic to use
  private selectedHeuristic: Heuristic = 0;

  // Start of the path
  private start: Vector2 = { x: 0, y: 0 };
  // Target of the path
  private target: Vector2 = { x: 3, y: 3 };

  // Previous target
  private oldTarget: Vector2 = { x: 3, y: 3 };

  // Draw the open/closed list on map
  private debugPathfinding: boolean = true;

  // Calculated path
  private path: Node[] | null = null;

  // To calcul the time needed to process the path
  private timeStart: number = 0;
  private timeEnd: number = 0;

  // Number of cell remaining to be check
  private openCount: number = 0;
  // Number of cell already checked
  private closedCount: number = 0;

  constructor() {
    this.mem = new MemView();

    this.terrainGrid = Array.from({ length: this.mapSize.y }, () =>
      Array(this.mapSize.x).fill({
        isStart: false,
        isEnd: false,
        isPath: false,
      })
    );

    this.pathGrid = Array.from({ length: this.mapSize.y }, () =>
      Array(this.mapSize.x).fill({
        isStart: false,
        isEnd: false,
        isPath: false,
      })
    );

    for (let iY = 0; iY < this.mapSize.y; iY++) {
      for (let iX = 0; iX < this.mapSize.x; iX++) {
        this.terrainGrid[iY][iX] = Math.random() > 0.9 ? 1 : 0;
      }
    }

    this.mem.bindKeyEvent(async (event) => {
      if (event.key === KeyCode.Numpad0 && event.isPressed) {
        this.selectedHeuristic = Heuristic.Manhattan;
      }

      if (event.key === KeyCode.Numpad1 && event.isPressed) {
        this.selectedHeuristic = Heuristic.Euclidian;
      }

      if (event.key === KeyCode.Numpad2 && event.isPressed) {
        this.selectedHeuristic = Heuristic.ManhattanRandom;
      }

      if (event.key === KeyCode.Space && event.isPressed) {
        this.debugPathfinding = !this.debugPathfinding;

        const emptyArray: any[][] = [];
        const emptySet: Set<string> = new Set<string>();

        await this.visualizeLists(emptyArray, emptySet);
      }
    });
  }

  public async init() {
    await this.mem.start({
      openNewTab: true,
      waitForTab: true,
      autoOrder: "None",
      showSideBar: true,
      showConsole: false,
      showCursor: false,
      lockDrag: false,
      lockZoom: false,
      renderOptions: {
        bitmapViewThreshold: Zoom.Divide2,
        textureDisplayThreshold: Zoom.Base,
        gridDisplayThreshold: Zoom.Base,
        textDisplayThreshold: Zoom.Base,
      },
    });

    this.renderTerrain();

    await this.mem.setView({
      position: { x: 8, y: 8 },
      zoom: Zoom.Divide2,
      handleResize: true,
    });

    while (true) {
      await this.renderTerrain();
      await this.renderPath();
      await this.renderInputs();

      await this.renderDisplay();

      if (this.target !== this.oldTarget) {
        if (this.terrainGrid[this.target.x][this.target.y] !== 0) {
          this.oldTarget = this.target;
        } else {
          this.timeStart = performance.now();
          this.path = await this.findPath(this.start, this.target);
          this.timeEnd = performance.now();
        }
      }
      this.oldTarget = this.target;

      this.pathGrid = Array.from({ length: this.mapSize.y }, () =>
        Array(this.mapSize.x).fill({
          isStart: false,
          isEnd: false,
          isPath: false,
        })
      );

      if (this.path) {
        for (let i = 0; i < this.path.length; i++) {
          this.pathGrid[this.path[i].x][this.path[i].y] = {
            isStart: i === 0,
            isEnd: i === this.path.length - 1,
            isPath: true,
          };
        }
      }

      await this.sleep(50);
    }
  }

  private async findPath(
    start: Vector2,
    target: Vector2
  ): Promise<Node[] | null> {
    const openList: Node[] = [];
    const closedList: Set<string> = new Set();

    const h = this.heuristic(start.x, start.y);

    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h,
      f: h,
      parent: null,
    };

    openList.push(startNode);

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const currentNode = openList.shift()!;
      closedList.add(`${currentNode.x},${currentNode.y}`);

      if (this.debugPathfinding) {
        await this.visualizeLists(openList, closedList);
      }

      if (currentNode.x === target.x && currentNode.y === target.y) {
        const path: Node[] = [];
        let node: Node | null = currentNode;
        while (node) {
          path.push(node);
          node = node.parent;
        }
        this.openCount = openList.length;
        this.closedCount = closedList.size;
        return path.reverse();
      }

      for (const neighbor of this.getNeighbors(currentNode)) {
        if (closedList.has(`${neighbor.x},${neighbor.y}`)) continue;

        const existingNode = openList.find(
          (n) => n.x === neighbor.x && n.y === neighbor.y
        );

        if (!existingNode || neighbor.g < existingNode.g) {
          openList.push(neighbor);
        }
      }
    }

    return null;
  }

  private async sleep(time: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, time));
  }

  private heuristic(x: number, y: number) {
    switch (this.selectedHeuristic) {
      case Heuristic.Manhattan:
        return Math.abs(x - this.target.x) + Math.abs(y - this.target.y);
      case Heuristic.Euclidian:
        return Math.sqrt(
          Math.pow(x - this.target.x, 2) + Math.pow(y - this.target.y, 2)
        );
      case Heuristic.ManhattanRandom:
        return (
          Math.abs(x - this.target.x) +
          Math.abs(y - this.target.y) +
          Math.random() * 2
        );
      default:
        return Math.abs(x - this.target.x) + Math.abs(y - this.target.y);
    }
  }

  private getNeighbors(node: Node): Node[] {
    const dirs = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    return dirs
      .map(([dx, dy]) => ({
        x: node.x + dx,
        y: node.y + dy,
      }))
      .filter(
        ({ x, y }) =>
          x >= 0 &&
          y >= 0 &&
          x < this.terrainGrid.length &&
          y < this.terrainGrid[0].length &&
          this.terrainGrid[x][y] === 0
      )
      .map(({ x, y }) => {
        const h = this.heuristic(x, y);

        return {
          x,
          y,
          g: node.g + 1,
          h,
          f: node.g + 1 + h,
          parent: node,
        };
      });
  }

  private async visualizeLists(openList: any[], closedList: Set<string>) {
    const visualGrid = Array.from({ length: this.mapSize.y }, () =>
      Array(this.mapSize.x).fill(0)
    );
    openList.forEach((node) => {
      if (visualGrid[node.x] && visualGrid[node.x][node.y] !== 1) {
        visualGrid[node.x][node.y] = 1;
      }
    });
    closedList.forEach((position) => {
      const [x, y] = position.split(",").map(Number);
      if (visualGrid[x] && visualGrid[x][y] !== 1) {
        visualGrid[x][y] = 2;
      }
    });

    await this.mem.log2d("open/closed lists", visualGrid, {
      position: { x: 0, y: 0 },
      zIndex: 2,
      mapper: {
        cellBackgroundColor: (el) => {
          return el === 2 ? "#c0505050" : el === 1 ? "#50c05050" : "#00000000";
        },
        cellAtlasIndex: (_) => {
          return { x: 0, y: 0 };
        },
        cellText: (el) => {
          return [];
        },
        details: (el) => {
          return [];
        },
      },
    });
  }

  private async renderTerrain() {
    await this.mem.log2d("terrain", this.terrainGrid, {
      isSync: true,
      mapper: {
        cellBackgroundColor: (el) => {
          return el === 0 ? "#5E4B41" : "#3E2B21";
        },
        cellAtlasIndex: (_) => {
          return { x: 0, y: 0 };
        },
        cellText: (el) => {
          return [];
        },
        details: (el) => {
          return [`value: ${el}`];
        },
      },
      zIndex: 1,
    });
  }

  private async renderPath() {
    await this.mem.log2d("path", this.pathGrid, {
      isSync: true,
      mapper: {
        cellBackgroundColor: (el) => {
          return el.isStart
            ? "#cc8040"
            : el.isEnd
            ? "#cc4040"
            : el.isPath
            ? "#999"
            : "#00000000";
        },
        cellAtlasIndex: (_) => {
          return { x: 0, y: 0 };
        },
        cellText: (el) => {
          return [
            {
              text: `${
                el.isStart ? "🤔" : el.isEnd ? "🎯" : el.isPath ? "✖️" : ""
              }`,
              fontSize: 40,
              color: "#ffffff",
              anchor: Anchor.Center,
            },
          ];
        },
        details: (el) => {
          return [`value: ${el}`];
        },
      },

      zIndex: 3,
    });
  }

  private async renderInputs() {
    await this.mem.log2d("inputs", this.terrainGrid, {
      isSync: true,
      mapper: {
        cellBackgroundColor: (el) => {
          return "#00000000";
        },
        cellAtlasIndex: (_) => {
          return { x: 0, y: 0 };
        },
        cellText: (el) => {
          return [];
        },
        details: (el) => {
          return [];
        },
      },
      output: {
        onMouseDown: async (position) => {
          if (this.terrainGrid[position.y][position.x] === 0) {
            if (this.mem.getKey(KeyCode.ShiftLeft)) {
              this.start = { x: position.y, y: position.x };
            } else {
              this.target = { x: position.y, y: position.x };
            }
          }
        },
      },
      zIndex: 4,
    });
  }

  private async renderDisplay() {
    await this.mem.logDisplay(
      "metrics",
      { x: 6, y: 12 },
      {
        position: {
          x: -64 * 7,
          y: 0,
        },
        backgroundColor: "#00000060",
        elements: [
          {
            id: "title",
            type: "Text",
            color: "#eee",
            position: { x: 192, y: 20 },
            size: { x: 250, y: 40 },
            value: "MemView Pathfinding",
            fontSize: 32,
            alignement: "center",
          },
          {
            id: "select_heuristic",
            type: "Text",
            value: `Select Heuristic`,
            position: {
              x: 10,
              y: 100,
            },
            fontSize: 30,
            color: "#ccc",
            alignement: "left",
            size: { x: 20, y: 20 },
          },
          {
            id: "button",
            type: "Button",
            position: { x: 10, y: 140 },
            size: { x: 250, y: 40 },
            value: `Manhattan`,
            fontSize: 26,
            alignement: "center",
            color: "#ccc",
            backgroundColor: "#808080",
            hoverBackgroundColor: "#707070",
            pressBackgroundColor: "#505050",
            onMouseDown: () => {
              this.selectedHeuristic = Heuristic.Manhattan;
            },
          },
          {
            id: "buttonLed",
            type: "Div",
            position: { x: 330, y: 140 },
            size: { x: 40, y: 40 },
            backgroundColor:
              this.selectedHeuristic === Heuristic.Manhattan
                ? "#40cc40"
                : "#405040",
          },
          {
            id: "button2",
            type: "Button",
            position: { x: 10, y: 190 },
            size: { x: 250, y: 40 },
            value: `Euclidian`,
            fontSize: 26,
            alignement: "center",
            color: "#ccc",
            backgroundColor: "#808080",
            hoverBackgroundColor: "#707070",
            pressBackgroundColor: "#505050",
            onMouseDown: () => {
              this.selectedHeuristic = Heuristic.Euclidian;
            },
          },
          {
            id: "button2Led",
            type: "Div",
            position: { x: 330, y: 190 },
            size: { x: 40, y: 40 },
            backgroundColor:
              this.selectedHeuristic === Heuristic.Euclidian
                ? "#40cc40"
                : "#405040",
          },
          {
            id: "button3",
            type: "Button",
            position: { x: 10, y: 240 },
            size: { x: 250, y: 40 },
            value: `Manhattan Random`,
            fontSize: 26,
            alignement: "center",
            color: "#ccc",
            backgroundColor: "#808080",
            hoverBackgroundColor: "#707070",
            pressBackgroundColor: "#505050",
            onMouseDown: () => {
              this.selectedHeuristic = Heuristic.ManhattanRandom;
            },
          },
          {
            id: "button3Led",
            type: "Div",
            position: { x: 330, y: 240 },
            size: { x: 40, y: 40 },
            backgroundColor:
              this.selectedHeuristic === Heuristic.ManhattanRandom
                ? "#40cc40"
                : "#405040",
          },
          {
            id: "show_openclosed",
            type: "Text",
            value: `Show Open/Closed`,
            position: {
              x: 10,
              y: 340,
            },
            fontSize: 30,
            color: "#ccc",
            alignement: "left",
            size: { x: 20, y: 20 },
          },
          {
            id: "button4",
            type: "Button",
            position: { x: 10, y: 380 },
            size: { x: 250, y: 40 },
            value: `Switch`,
            fontSize: 26,
            alignement: "center",
            color: "#ccc",
            backgroundColor: "#808080",
            hoverBackgroundColor: "#707070",
            pressBackgroundColor: "#505050",
            onMouseDown: async () => {
              this.debugPathfinding = !this.debugPathfinding;

              const emptyArray: any[][] = [];
              const emptySet: Set<string> = new Set<string>();

              await this.visualizeLists(emptyArray, emptySet);
            },
          },
          {
            id: "debugButtonLed",
            type: "Div",
            position: { x: 330, y: 380 },
            size: { x: 40, y: 40 },
            backgroundColor: this.debugPathfinding ? "#40cc40" : "#405040",
          },
          {
            id: "frametime",
            type: "Text",
            value: `Exec: ${(this.timeEnd - this.timeStart).toFixed(2)} ms`,
            position: {
              x: 10,
              y: 500,
            },
            fontSize: 32,
            color: "#ccc",
            alignement: "left",
            size: { x: 20, y: 20 },
          },
          {
            id: "openCount",
            type: "Text",
            value: `Open: ${this.openCount}`,
            position: {
              x: 10,
              y: 540,
            },
            fontSize: 32,
            color: "#ccc",
            alignement: "left",
            size: { x: 20, y: 20 },
          },
          {
            id: "closedCount",
            type: "Text",
            value: `Closed: ${this.closedCount}`,
            position: {
              x: 10,
              y: 580,
            },
            fontSize: 32,
            color: "#ccc",
            alignement: "left",
            size: { x: 20, y: 20 },
          },
          {
            id: "distance",
            type: "Text",
            value: `Distance: ${
              Math.abs(this.start.x - this.target.x) +
              Math.abs(this.start.y - this.target.y)
            }`,
            position: {
              x: 10,
              y: 620,
            },
            fontSize: 32,
            color: "#ccc",
            alignement: "left",
            size: { x: 20, y: 20 },
          },
        ],
      }
    );
  }
}
