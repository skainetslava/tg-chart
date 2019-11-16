<script>
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import { data } from "../data.js";
  import { ratio } from "../store/stats.js";
  import { setContext, getContext } from "svelte";
  import { theme } from "../store/stats";

  const dispatch = createEventDispatcher();

  export let rightBorderMap;
  export let leftBorderMap;
  export let columnChart;
  export let xData;
  export let yData;
  export let draw;

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

  let ratioMap = 34;

  $: scale = ratioMap * widthColumn;
  $: leftBorder = leftBorderMap + widthBorder || 0;
  $: rightBorder = rightBorderMap + widthBorder;


  onMount(() => {
    if (!canvasRef.getContext) {
      return;
    }
    const ctx = canvasRef.getContext("2d");
    draw(ctx, 0.5);

    ratio.update(() => columnChart / widthColumn);
  });

  afterUpdate(() => {
    offset = mapRef.offsetLeft;
  });

  const checkChartBorders = x => {
    if (x < -widthBorder) {
      return -widthBorder;
    }
    if (x + scale > 1000) {
      return 990 - scale;
    }

    return x;
  };

  const checkRightSlider = x => {
    if (x - leftBorder < 150 && x < rightBorder) {
      x = rightBorder;
    }
    return x;
  };

  const checkLeftSlider = x => {
    if (rightBorder - x < 150 && x > leftBorder) {
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
    rightBorder = leftBorder + scale + widthBorder;

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
      rightBorder = checkRightSlider(e.clientX - offset - 6);
    } else {
      leftBorder = checkLeftSlider(e.clientX - offset + 6);
    }

    ratioMap = (rightBorder - widthBorder - leftBorder) / widthColumn;
    dispatch("changeScale", {
      leftBorder,
      ratioMap,
      widthColumnMap: widthColumn
    });
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
    width: 1000px;
  }

  .mask--light {
    background: rgba(226, 238, 249, 1);
  }

  .mask--dark {
    background: #2b3645;
  }

  .left {
    left: 0;
  }

  .handle {
    position: absolute;
    border-radius: 5px;
    height: calc(100% - 6px);
    z-index: 2;
    cursor: grab;
  }

  .handle--light {
    border: 3px solid #c0d1e1;
  }
  .handle--dark {
    border: 3px solid #56626d;
  }

  .border {
    position: absolute;
    width: 12px;
    height: 100%;
    cursor: w-resize;
    z-index: 2;
  }

  .border--light {
    background: #c0d1e1;
  }
  .border--dark {
    background: #56626d;
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
    class="mask mask--{$theme} right"
    style="transform: translateX({leftBorder + scale + widthBorder}px); width: {1000 - scale - leftBorder}px" />
  <div
    class="mask mask--{$theme} left"
    style="transform: translateX({leftBorder - 1000}px);" />

  <div
    on:mousedown={() => (isMouseDown = true)}
    class="handle handle--{$theme}"
    style="transform: translateX({leftBorder + widthBorder}px); width: {scale}px" />

  <div
    class="border border--{$theme} border_left"
    style="transform: translateX({leftBorder}px);"
    on:mousedown={handleDownLeftBorder} />
  <div
    class="border border--{$theme} border_right"
    style="transform: translateX({leftBorder + scale + widthBorder}px);"
    on:mousedown={handleDownRightBorder} />

  <canvas
    bind:this={canvasRef}
    class="map"
    width="1000px"
    height="50px"
    style="transform: translateX(0px);" />
</div>
