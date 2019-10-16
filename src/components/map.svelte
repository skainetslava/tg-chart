<script>
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import { data } from "../data.js";
  import { ratio } from "../store/stats.js";

  const dispatch = createEventDispatcher();

  export let positionChart;
  export let columnChart;
  export let xData;
  export let yData;

  let canvasRef;
  let mapRef;

  const widthColumn = 800 / xData.length;

  let isMouseDown = false;
  let offset = 0;

  $: currentPositionX = -positionChart;

  onMount(() => {
    if (!canvasRef.getContext) {
      return null;
    }
  ratio.update(() => columnChart / widthColumn);

    const ctx = canvasRef.getContext("2d");
    drawRectangle(ctx);
  });

  afterUpdate(() => {
    offset = mapRef.offsetLeft;
  });

  const drawRectangle = ctx => {
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
    let position = x - offset;

    if (position <= 0) {
      return 0;
    }
    if (position >= 600) {
      return 600;
    }

    return position;
  };

  const handleMouseMove = e => {
    if (!isMouseDown) {
      return;
    }

    currentPositionX = checkChartBorders(e.clientX - 50);
    ratio.update(() => 30 / widthColumn);
    dispatch("move", { positionXMap: currentPositionX });
  };
</script>

<div
  class="map-wrapper"
  bind:this={mapRef}
  on:mousemove={handleMouseMove}
  on:mousedown={() => (isMouseDown = true)}
  on:mouseenter={() => (isMouseDown = false)}
  on:mouseup={() => (isMouseDown = false)}>

  <div
    class="mask right"
    style="transform: translateX({currentPositionX + 200}px); width: {800 - 200 - currentPositionX}px" />
  <div
    class="mask left"
    style="transform: translateX({currentPositionX - 800}px);" />
  <div class="handle" style="transform: translateX({currentPositionX}px);" />

  <canvas
    bind:this={canvasRef}
    class="map"
    width="800px"
    height="50px"
    style="transform: translateX(0px);" />
</div>

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