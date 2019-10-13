<script>
  import { onMount } from "svelte";
  import { data } from "../data.js";
  import { formateDate } from "../utils/formateDate.js";
  import Map from "./map.svelte";

  let canvas;
  let tooltip;

  const xData = data.columns[0].slice(1);
  const yData = data.columns[1].slice(1);

  let columns = [];
  let limit = 0;
  let currentPositionX = 0;
  let initialPositionX = 0;
  let isMouseDown = false;

  $: {
    columns = [];
    for (let i = 0; i < xData.length; i++) {
      columns = [...columns, i * 30 + currentPositionX];
    }
  }

  onMount(() => {
    if (canvas.getContext) {
      const ctx = canvas.getContext("2d");
      drawRectangle(ctx);
      drawAxis(ctx);
      drawTextX(ctx);
      drawTextY(ctx);
    }
  });

  const drawRectangle = ctx => {
    for (let i = 0; i < xData.length; i++) {
      ctx.fillStyle = "#64aded";
      ctx.fillRect(i * 30, 500 - yData[i] * 5 - 40, 30, yData[i] * 5);
    }
  };

  const drawAxis = ctx => {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#EAEBF3";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(30, 92 * i);
      ctx.lineTo(xData.length * 30, 92 * i);
      ctx.stroke();
    }
  };

  const drawTextX = ctx => {
    ctx.fillStyle = "black";
    for (let i = 0; i < xData.length; i++) {
      if (i % 5 === 0) {
        const date = formateDate(xData[i], "short");
        ctx.font = "14px Trebuchet MS";
        ctx.fillText(date, 30 + i * 30, 480);
      }
    }
  };

  const drawTextY = (ctx, y = 15) => {
    ctx.fillStyle = "#737373";
    for (let i = 0; i < 5; i++) {
      const date = formateDate(xData[i], "short");
      ctx.font = "14px Roboto";
      ctx.fillText(100 - i * 20, y, i * 92 - 5);
    }
  };

  const getLimitBorder = x => {
    const index = findColumnIndex(x);
    limit = columns[index] + 30;
  };

  const findColumnIndex = x => {
    return columns.findIndex(
      (column, i) =>
        column + 10 < x && (!columns[i + 1] || x < columns[i + 1] + 10)
    );
  };

  const checkTooltipBorders = x => {
    let rightX = x;

    if (rightX < 100) {
      rightX = 100;
    }
    if (rightX > 700) {
      rightX = 700;
    }

    return rightX;
  };

  const renderTooltip = e => {
    const index = findColumnIndex(e.clientX);
    const dateColumn = formateDate(xData[index], "long");
    const viewsColumn = yData[index];

    tooltip = {
      x: checkTooltipBorders(e.clientX),
      y: e.clientY,
      date: dateColumn,
      views: viewsColumn
    };
  };

  const checkChartBorders = (x, translate, widthChart) => {
    let position = translate;

    if (translate >= widthChart) {
      position = -widthChart;
      return position;
    }
    if (translate <= 0) {
      position = 0;
    } else {
      position = -translate;
    }

    return position;
  };

  const handleMouseMove = e => {
    if (isMouseDown) {
      const translate = -1 * (e.clientX - initialPositionX);
      const invisibleWidth = xData.length * 30 - 800;

      currentPositionX = checkChartBorders(
        e.clientX,
        translate,
        invisibleWidth
      );
      renderTooltip({ clientX: e.clientX });
    }
    getLimitBorder(e.clientX);
  };

  const handleMouseDown = e => {
    initialPositionX = e.pageX + -1 * currentPositionX;
    isMouseDown = true;
  };

  const handleMouseLeave = () => {
    isMouseDown = false;
    tooltip = null;
  };

  const handleMouseEnter = e => {
    renderTooltip(e);
  };
</script>

<style>
  :global(html) {
    font-family: "Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande",
      "Lucida Sans", Arial, sans-serif;
  }
  .chart {
    position: relative;
    height: 505px;
    width: 800px;
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

  .chart:hover .wrapper-left {
    opacity: 0.3;
  }
  .chart:hover .wrapper-right {
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
  .tooltip {
    position: absolute;
    padding: 8px;
    background: #fff;
    box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0);
    border: 1px solid rgb(238, 227, 227);
    border-radius: 10px;
  }

  .text {
    font-weight: 600;
  }
  p {
    margin: 0;
    padding: 0;
  }
</style>

<div
  class="chart"
  on:mousemove={handleMouseMove}
  on:mousedown={handleMouseDown}
  on:mouseleave={handleMouseLeave}
  on:mouseup={() => (isMouseDown = false)}
  style={isMouseDown ? 'cursor: grabbing' : 'cursor: grab'}>

  <canvas
    bind:this={canvas}
    on:mouseenter={handleMouseEnter}
    class="cnvs"
    width="{xData.length * 30}"
    height="504px"
    style="transform: translateX({currentPositionX}px);" />

  <div class="wrapper-left" style="transform: translateX({limit}px);" />
  <div
    class="wrapper-right"
    style="transform: translateX({limit - 30 - 800}px);" />

  {#if tooltip}
    <div class="tooltip" style="top: 50px; left: {tooltip.x - 65}px">
      <p class="text">{tooltip.date}</p>
      <p>Views: {tooltip.views}</p>
    </div>
  {/if}
</div>
  <Map />

