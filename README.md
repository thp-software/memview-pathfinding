# MemView Pathfinding

<p align="center">
  <img width="800" src="./assets/rsc/pathfinding.png#center">
</p>

This piece of software is designed to showcase the capabilities of MemView.

### Play with it

#### Prerequisites

You need to have NodeJS runtime on your computer https://nodejs.org/

Download the .zip file by clicking the green "Code" button and selecting "Download ZIP".

Once downloaded, extract it to a folder, navigate to that folder, and run:

`npm i`

Then start the game with:

`npm run dev`

It will automatically open a new tab in your browser to play the game.

### How to use it

You can click somewhere on the map (on a light brown cell), and it will calculate the path to it.

You can choose between 3 heuristic methods :

- Manhattan (press numpad 0).
- Euclidian (press numpad 1).
- Manhattan With Random (press numpad 2).

You can also choose to show the open/closed lists on the map by pressing the spacebar.

You can change the position of start by clicking on a cell while maintaining Left Shift.

You can change the world size by setting

```ts
private mapSize: Vector2 = { x: 16, y: 16 };
```

in `Pathfinding.ts`
