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

  const widthBorder = 5;
  const widthColumn = 1000 / xData.length;

  let isMouseDown = false;
  let isMovingRightBorder = false;
  let isMovingLeftBorder = false;

  let scale = 300;
  let offset = 0;

  let leftBorder = 0;
  let rightBorder = leftBorder + scale + 15;
  let distance;

  $: scale = $ratioMap * widthColumn;
  $: leftBorder = -positionChart || 0;

  onMount(() => {
    if (!canvasRef.getContext) {
      return;
    }
    const ctx = canvasRef.getContext("2d");
    drawRectangle(ctx);

    ratio.update(() => columnChart / widthColumn);
  });

  afterUpdate(() => {
    offset = mapRef.offsetLeft;
  });

  const drawRectangle = ctx => {
    for (let i = 0; i < xData.length; i++) {
      const heightColumn = yData[i] * 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * widthColumn, 50 - heightColumn);
      ctx.lineTo((i + 1) * widthColumn, 50 - yData[i + 1] * 0.5);
      ctx.strokeStyle = "#C9AF4F";
      ctx.stroke();
    }
  };

  const checkChartBorders = x => {
    if (x < 0) {
      return 0;
    }
    if (x + scale > 1000) {
      return 990 - scale;
    }

    return x;
  };

  const checkRightSlider = x => {
    if (rightBorder - leftBorder < 150 && x < rightBorder) {
      x = rightBorder;
    }
    return x;
  };

  const checkLeftSlider = x => {
    if (rightBorder - leftBorder < 150 && x > leftBorder) {
      x = leftBorder;
    }
    return x;
  };

  const handleSliderMove = e => {
    if (!isMouseDown) {
      return;
    }

    const x = e.clientX;

    if (!distance) {
      distance = x - leftBorder;
    }

    leftBorder = checkChartBorders(x - distance);
    rightBorder = checkChartBorders(leftBorder + scale + widthBorder);

    dispatch("move", { positionXMap: leftBorder });
  };

  const handleDownRightBorder = e => {
    isMovingRightBorder = true;
  };

  const handleDownLeftBorder = e => {
    isMovingLeftBorder = true;
  };

  const handleMoveBorder = e => {
    if (isMouseDown) {
      handleSliderMove(e);
    }

    if (!isMovingRightBorder && !isMovingLeftBorder) {
      return;
    }

    if (isMovingRightBorder) {
      rightBorder = checkRightSlider(e.clientX - offset);
    } else {
      leftBorder = checkLeftSlider(e.clientX - offset - 15);
    }

    const widthSlider = (rightBorder - widthBorder - leftBorder) / widthColumn;
    const newRatio = columnChart / widthColumn;

    ratioMap.update(() => widthSlider);
    ratio.update(() => newRatio);

    dispatch("changeScale", { leftBorder, newRatio });
  };

  const resetMouseActions = () => {
    isMovingLeftBorder = false;
    isMovingRightBorder = false;
    isMouseDown = false;
    distance = null;
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
    border: 3px solid #c0d1e1;
    border-radius: 5px;
    height: calc(100% - 6px);
    z-index: 2;
    cursor: grab;
  }

  .border {
    position: absolute;
    width: 12px;
    background: #c0d1e1;
    height: 100%;
    cursor: w-resize;

    z-index: 2;
  }

  .border_left {
    border-bottom-left-radius: 6px;
    border-top-left-radius: 6px;
    left: 0;
  }
  .border_left::after,
  .border_right::after {
    position: absolute;
    background: white;
    width: 3px;
    border-radius: 4px;
    height: 15px;
    left: 5px;
    top: 17px;
    display: block;
    content: " ";
    z-index: 1;
    cursor: w-resize;
    -moz-user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .border_right {
    border-bottom-right-radius: 6px;
    border-top-right-radius: 6px;
  }
</style>

<svelte:window
  on:mousemove={handleMoveBorder}
  on:mouseup={resetMouseActions}
  on:mouseenter={resetMouseActions} />

<div class="map-wrapper" bind:this={mapRef}>
  <div
    class="mask right"
    style="transform: translateX({leftBorder + scale + widthBorder}px); width: {1000 - scale - leftBorder}px" />
  <div
    class="mask left"
    style="transform: translateX({leftBorder - 1000}px);" />

  <div
    on:mousedown={() => (isMouseDown = true)}
    class="handle"
    style="transform: translateX({leftBorder + widthBorder}px); width: {scale}px" />

  <div
    class="border border_left"
    style="transform: translateX({leftBorder}px);"
    on:mousedown={handleDownLeftBorder} />
  <div
    class="border border_right"
    style="transform: translateX({leftBorder + scale + widthBorder}px);"
    on:mousedown={handleDownRightBorder} />

  <canvas
    bind:this={canvasRef}
    class="map"
    width="1000px"
    height="50px"
    style="transform: translateX(0px);" />
</div>
