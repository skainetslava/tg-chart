<script>
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import { data } from "../data.js";
  import { ratio, ratioMap } from "../store/stats.js";

  const dispatch = createEventDispatcher();

  export let positionChart;
  export let columnChart;
  export let xData;
  export let yData;

  let canvasRef;
  let mapRef;

  const widthColumn = 1000 / xData.length;

  let scale = 300;
  let isMouseDown = false;
  let offset = 0;
  let value;

  let leftBorder = 0;
  let rightBorder = leftBorder + scale;

  $: currentPositionX = -positionChart;
  $: scale = $ratioMap * widthColumn;

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
    if (position >= 800) {
      return 800;
    }

    return position;
  };

  const handleMouseMove = e => {
    if (!isMouseDown) {
      return;
    }

    currentPositionX = checkChartBorders(e.clientX - 50);
    ratio.update(() => 30 / widthColumn);

    rightBorder = currentPositionX + scale;
    leftBorder = currentPositionX;

    dispatch("move", { positionXMap: currentPositionX });
  };

  const handleChange = e => {
    ratioMap.update(() => value / widthColumn);
    dispatch("changeScale", { ratio: value / widthColumn });
  };

  const handleMoveRightBorder = e => {
    isMouseDown = true;
  };

  const handleMoveLeftBorder = e => {
    isMouseDown = true;
    const x = e.clientX - offset - 15;

    ratioMap.update(() => x / widthColumn);
    dispatch("changeScale", { ratio: x / widthColumn });
  };

  const handleMouseMoveByRightBorder = e => {
    if (!isMouseDown) {
      return;
    }
    const x = e.clientX - offset - 15;
    const ratio = (rightBorder - leftBorder) / widthColumn;

    rightBorder = x;
    ratioMap.update(() => ratio);
    dispatch("changeScale", { ratio });
  };

  const handleMouseMoveByLeftBorder = e => {
    if (!isMouseDown) {
      return;
    }
    const x = e.clientX - offset - 15;
    const ratio = (rightBorder - leftBorder) / widthColumn;

    leftBorder = x;
    ratioMap.update(() => ratio);
    dispatch("changeScale", { ratio });
  };
</script>

<style>
  .map-wrapper {
    position: relative;
    width: 1000px;
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
    width: 1000px;
  }

  .left {
    left: 0;
  }

  .handle {
    position: absolute;
    border: 1px solid #000;
    border-radius: 5px;
    height: 95%;
    width: 312px;
    z-index: 2;
    cursor: grab;
  }

  .border {
    position: absolute;
    height: 100%;
    width: 30px;
    background: blue;
    z-index: 2;
  }
</style>

<div class="map-wrapper" bind:this={mapRef}>

  <div
    class="mask right"
    style="transform: translateX({currentPositionX + scale}px); width: {1000 - scale - currentPositionX}px" />
  <div
    class="mask left"
    style="transform: translateX({currentPositionX - 1000}px);" />

  <div
    on:mousemove={handleMouseMove}
    on:mousedown={() => (isMouseDown = true)}
    on:mouseenter={() => (isMouseDown = false)}
    on:mouseup={() => (isMouseDown = false)}
    class="handle"
    style="transform: translateX({leftBorder}px); width: {scale}px" />

  <div
    class="border"
    style="transform: translateX({leftBorder}px);"
    on:mousedown={handleMoveLeftBorder}
    on:mousemove={handleMouseMoveByLeftBorder} />
  <div
    class="border"
    style="transform: translateX({rightBorder}px);"
    on:mousedown={handleMoveRightBorder}
    on:mousemove={handleMouseMoveByRightBorder}
    on:mouseup={() => (isMouseDown = false)} />

  <canvas
    bind:this={canvasRef}
    class="map"
    width="1000px"
    height="50px"
    style="transform: translateX(0px);" />
</div>
