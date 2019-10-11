<script>
  import { onMount } from "svelte";
  import { data } from "./data.js";

  let canvas;

  const xData = data.columns[0].slice(1);
  const yData = data.columns[1].slice(1);

  let columns = [];
  let limit = 0;
  let currentPositionX = 0;
  let initialPositionX = 0;
  let isMouseDown = false;

  $: for (let i = 0; i < xData.length; i++) {
    columns.push(i * 30 + currentPositionX % 30);
  }

  onMount(() => {
    if (canvas.getContext) {
      let ctx = canvas.getContext("2d");

      drawRectangle(ctx);
      drawAxis(ctx);
      drawTextX(ctx);
    }
  });

  const drawRectangle = ctx => {
    for (var i = 0; i < xData.length; i++) {
      ctx.fillStyle = "#F34C44";
      const dp = yData[i];

      ctx.fillRect(i * 30, 500 - dp * 5 - 40, 30, dp * 5);
    }
  };

  const drawAxis = ctx => {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#EAEBF3";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(30, 92 * i);
      ctx.lineTo(1850, 92 * i);
      ctx.stroke();
    }
  };

  const drawTextX = ctx => {
    ctx.fillStyle = "black";

    for (let i = 0; i < xData.length; i++) {
      if (i % 5 === 0) {
        const day = new Date(xData[i]).getDate();
        const month = new Date(xData[i]).toLocaleString("en", {
          month: "short"
        });

        const date = `${day} ${month}`;
        ctx.fillText(date, 30 + i * 30, 480);
      }
    }
  };

  const getLimitValue = x => {
    columns.forEach((column, i) => {
      if (column < x && (!columns[i + 1] || x < columns[i + 1])) {
        limit = column + 30;
      }
    });
  };

  const handleMouseMove = e => {
    if (isMouseDown) {
      let translate = e.clientX - initialPositionX;
      currentPositionX = translate <= 0 ? translate : 0;
    }
    getLimitValue(e.clientX);
  };

  const handleMouseDown = e => {
    initialPositionX = e.pageX + -1 * currentPositionX;
    isMouseDown = true;
  };

  const handleMouseUp = e => {
    isMouseDown = false;
  };
</script>

<style>
  .app {
    position: relative;
    height: 505px;
    width: 800px;
    transition: 0.1s;
    overflow: hidden;
  }

  .wrapper-left {
    position: absolute;
    height: 100%;
    width: 800px;
    left: 0;
    top: 0;
    background: white;
    opacity: 0;
  }

  .app:hover .wrapper-left {
    opacity: 0.3;
  }
  .app:hover .wrapper-right {
    opacity: 0.3;
  }
  .wrapper-right {
    position: absolute;
    height: 100%;
    top: 0;
    background: white;
    width: 100%;
    opacity: 0;
  }
  .cnvs {
    position: relative;
  }
</style>

<div
  class="app"
  on:mousemove={handleMouseMove}
  on:mousedown={handleMouseDown}
  on:mouseleave={() => (isMouseDown = false)}
  on:mouseup={() => (isMouseDown = false)}
  style={isMouseDown ? 'cursor: grabbing' : 'cursor: grab'}>
  {currentPositionX}
  <canvas
    bind:this={canvas}
    class="cnvs"
    width="1300px"
    height="504px"
    style="transform: translateX({currentPositionX}px);" />
  <div class="wrapper-left" style="transform: translateX({limit}px);" />
  <div
    class="wrapper-right"
    style="transform: translateX({limit - 30 - 800}px);" />
</div>
