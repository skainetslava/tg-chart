<script>
  import { onMount } from "svelte";
  import { data } from "../data.js";

  let canvas;

  const xData = data.columns[0].slice(1);
  const yData = data.columns[1].slice(1);

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
    width: 100px;
    z-index: 2;
    cursor: grab;
  }
</style>

<div class="map-wrapper">
  <div
    class="mask right"
    style="transform: translateX({500}px); width: {800 - 500}px" />
  <div class="mask left" style="transform: translateX({-400}px);" />
  <div class="handle" style="transform: translateX({400}px);" />
  <canvas
    bind:this={canvas}
    class="map"
    width="800px"
    height="50px"
    style="transform: translateX({0}px);" />
</div>
