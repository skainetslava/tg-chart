<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { data } from "../data.js";

  const dispatch = createEventDispatcher();

  export let positionChart;
  let canvas;

  const xData = data.columns[0].slice(1);
  const yData = data.columns[1].slice(1);

  let isMouseDown = false;
  let initialPositionX = 0;

  $: currentPositionX = -positionChart;

  onMount(() => {
    if (canvas.getContext) {
      const ctx = canvas.getContext("2d");
      drawRectangle(ctx);
    }
  });

  const drawRectangle = ctx => {
    const widthColumn = 800 / xData.length;
    for (let i = 0; i < xData.length; i++) {
      const heightColumn = yData[i] * 0.5;
      ctx.fillStyle = "#64aded";
      ctx.fillRect(
        i * widthColumn,
        50 - heightColumn,
        widthColumn,
        heightColumn
      );
    }
  };

  const checkChartBorders = x => {
    let position = x;

    if (x <= 0) {
      return 0;
    }
    if (x >= 700) {
      return 697;
    }

    return position;
  };

  const handleMouseMove = e => {
    if (isMouseDown) {
      currentPositionX = checkChartBorders(e.clientX - 50);
      dispatch("move", { position: currentPositionX });
    }
  };

  const handleMouseDown = e => {
    initialPositionX = e.clientX;
    isMouseDown = true;
  };
</script>

<style>
  .map-wrapper {
    position: relative;
    width: 800px;
    height: 50px;
    overflow: hidden;
  }

  .map,
  .mask {
    border-radius: 5px;
  }

  .mask {
    position: absolute;
    height: 100%;
    background: rgba(226, 238, 249, 1);
    width: 800px;
  }

  .left {
    left: 0;
  }

  .handle {
    position: absolute;
    border: 1px solid #000;
    border-radius: 5px;
    height: 95%;
    width: 200px;
    z-index: 2;
    cursor: grab;
  }
</style>

<div
  class="map-wrapper"
  on:mousemove={handleMouseMove}
  on:mousedown={handleMouseDown}
  on:mouseenter={() => (isMouseDown = false)}
  on:mouseup={() => (isMouseDown = false)}>

  <div
    class="mask right"
    style="transform: translateX({currentPositionX + 200}px); width: {800 - currentPositionX}px" />
  <div
    class="mask left"
    style="transform: translateX({currentPositionX - 800}px);" />
  <div class="handle" style="transform: translateX({currentPositionX}px);" />

  <canvas
    bind:this={canvas}
    class="map"
    width="800px"
    height="50px"
    style="transform: translateX(0px);" />
</div>
