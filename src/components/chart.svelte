<script>
  import { onMount, afterUpdate } from "svelte";
  import { data } from "../data.js";
  import { ratio, ratioMap } from "../store/stats.js";
  import { formateDate } from "../utils/formateDate.js";
  import Map from "./map.svelte";

  let canvasRef;
  let chartRef;

  let ctx;

  const xData = data.columns[0].slice(1);
  const yData = data.columns[1].slice(1);

  let widthColumn = 30;
  let tooltip;
  let limit = 0;
  let currentPositionX = 0;
  let initialPositionX = 0;
  let isMouseDown = false;
  let positionXMap = 0;
  let offset = 0;
  let currentColumn;

  const widthCanvas = xData.length * widthColumn;
  const dataArray = xData.map((val, i) => i * widthColumn);

  $: columns = xData.map((val, i) => i * widthColumn + currentPositionX);

  let endDay;
  let startDay;

  $: {
    startDay = Math.round(-currentPositionX / widthColumn);
    endDay = startDay + Math.round(1000 / widthColumn);
  }

  onMount(() => {
    if (canvasRef.getContext) {
      ctx = canvasRef.getContext("2d");
      draw(ctx);
    }
  });

  afterUpdate(() => {
    offset = chartRef.offsetLeft;
  });

  const draw = () => {
    drawRectangle(ctx);
    drawAxis(ctx);
    drawTextX(ctx);
    drawTextY(ctx);
  };

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
    limit = currentColumn * widthColumn + widthColumn + currentPositionX;
  };

  const findColumnIndex = (x, dataArray = columns) => {
    const position = x - offset;
    return dataArray.findIndex(
      (column, i) => column <= position && position <= dataArray[i + 1]
    );
  };

  const checkTooltipBorders = x => {
    let rightX = x - offset;

    if (rightX < 100) {
      rightX = 100;
    }
    if (rightX > 940) {
      rightX = 940;
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
    if (!chartRef.contains(e.target)) {
      tooltip = null;
      return;
    }
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
        widthCanvas - 1000
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
    const { positionXMap } = detail;
    currentPositionX = -positionXMap * $ratio;
  };

  const handleChangeScale = ({ detail }) => {
    if (!ctx) {
      return;
    }

    const { leftBorder } = detail;

    widthColumn = 1000 / $ratioMap;
    currentPositionX = -leftBorder * $ratio;

    ctx.clearRect(0, 0, widthCanvas, 504);
    draw(ctx);
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
    width: 1000px;
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
  .header {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
</style>

<div class="chart-one">
  <div class="header">
    <p class="title">Chart one</p>
    <p>
      {formateDate(xData[startDay], 'short')} - {formateDate(xData[endDay], 'short')}
    </p>
  </div>
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
      style="transform: translateX({limit - widthColumn - 1000}px);" />

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
    on:changeScale={handleChangeScale}
    {xData}
    {yData} />
</div>