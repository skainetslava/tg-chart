<script>
  import { onMount, afterUpdate } from "svelte";
  import { data } from "../data.js";
  import { ratio } from "../store/stats.js";
  import { formateDate } from "../utils/formateDate.js";
  import Map from "./map.svelte";

  let canvasRef;
  let chartRef;

  const xData = data.columns[0].slice(1);
  const yData = data.columns[1].slice(1);
  const widthColumn = 30;
  const widthCanvas = xData.length * widthColumn;

  let tooltip;
  let limit = 0;
  let currentPositionX = 0;
  let initialPositionX = 0;
  let isMouseDown = false;
  let positionXMap = 0;
  let offset = 0;
  let currentColumn;

  $: columns = xData.map((val, i) => i * widthColumn + currentPositionX);

  onMount(() => {
    if (canvasRef.getContext) {
      const ctx = canvasRef.getContext("2d");
      drawRectangle(ctx);
      drawAxis(ctx);
      drawTextX(ctx);
      drawTextY(ctx);
    }
  });

  afterUpdate(() => {
    offset = chartRef.offsetLeft;
  });

  const drawRectangle = ctx => {
    for (let i = 0; i < xData.length; i++) {
      ctx.fillStyle = "#64aded";
      ctx.fillRect(
        i * widthColumn,
        500 - yData[i] * 5 - 40,
        widthColumn,
        yData[i] * 5
      );
    }
  };

  const drawAxis = ctx => {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#EAEBF3";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(widthColumn, 92 * i);
      ctx.lineTo(widthCanvas, 92 * i);
      ctx.stroke();
    }
  };

  const drawTextX = ctx => {
    ctx.fillStyle = "#a6a6a6";
    for (let i = 0; i < xData.length; i++) {
      if (i % 5 === 0) {
        const date = formateDate(xData[i], "short");
        ctx.font = "14px Roboto";
        ctx.we;
        ctx.fillText(date, widthColumn * (i + 1), 480);
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
    if (!currentColumn || !isMouseDown) {
      currentColumn = findColumnIndex(x);
    }
    limit = currentColumn * 30 + widthColumn + currentPositionX;
  };

  const findColumnIndex = x => {
    const position = x - offset;
    return columns.findIndex(
      (column, i) => column <= position && position <= columns[i + 1]
    );
  };

  const checkTooltipBorders = x => {
    let rightX = x - offset;

    if (rightX < 100) {
      rightX = 100;
    }
    if (rightX > 700) {
      rightX = 700;
    }

    return rightX;
  };

  const updateDataTooltip = e => {
    const index = findColumnIndex(e.clientX);
    const dateColumn = formateDate(xData[index], "long");
    const viewsColumn = yData[index];

    tooltip = {
      ...tooltip,
      date: dateColumn,
      views: viewsColumn
    };
  };

  const updatePositionTooltip = e => {
    tooltip = {
      ...tooltip,
      x: checkTooltipBorders(e.clientX),
      y: e.clientY
    };
  };

  const renderTooltip = e => {
    updateDataTooltip(e);
    updatePositionTooltip(e);
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

      currentPositionX = checkChartBorders(
        e.clientX,
        translate,
        widthCanvas - 800
      );

      positionXMap = currentPositionX / $ratio;
      updatePositionTooltip(e);
    } else {
      renderTooltip(e);
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

  const moveSlider = ({ detail }) => {
    currentPositionX = -detail.positionXMap * $ratio;
  };
</script>

<style>
  .title {
    margin-bottom: 48px;
    font-weight: bold;
    font-size: 18px;
  }
  .chart-one {
    margin: 0 auto;
  }
  .chart {
    position: relative;
    height: 505px;
    width: 800px;
    overflow: hidden;
  }

  .chart:hover .wrapper {
    opacity: 0.3;
  }
  .wrapper {
    position: absolute;
    top: 0;
    height: 100%;
    width: 100%;
    opacity: 0;
    background: white;
    transition: opacity 0.3s;
  }

  .left {
    left: 0;
  }
  .tooltip {
    position: absolute;
    padding: 8px 12px;
    background: #fff;
    box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0);
    border: 1px solid rgb(238, 227, 227);
    border-radius: 10px;
  }
  .date {
    line-height: 1.5em;
    font-weight: 600;
  }
  .views {
    font-weight: 600;
    color: #64aded;
  }
</style>

<div class="chart-one">
  <p class="title">Chart one</p>
  <div
    class="chart"
    bind:this={chartRef}
    on:mousemove={handleMouseMove}
    on:mousedown={handleMouseDown}
    on:mouseleave={handleMouseLeave}
    on:mouseup={() => (isMouseDown = false)}
    style={isMouseDown ? 'cursor: grabbing' : 'cursor: grab'}>

    <canvas
      bind:this={canvasRef}
      on:mouseover={handleMouseEnter}
      class="cnvs"
      width={widthCanvas}
      height="504px"
      style="transform: translateX({currentPositionX}px);" />

    <div class="wrapper left" style="transform: translateX({limit}px);" />
    <div
      class="wrapper right"
      style="transform: translateX({limit - widthColumn - 800}px);" />

    {#if tooltip}
      <div class="tooltip" style="top: 50px; left: {tooltip.x - 65}px">
        <p class="date">{tooltip.date}</p>
        <p>
          Views:
          <span class="views">{tooltip.views}</span>
        </p>
      </div>
    {/if}
  </div>

  <Map
    positionChart={positionXMap}
    on:move={moveSlider}
    columnChart={widthColumn}
    {xData}
    {yData} />
</div>
