<script>
  import { onMount, afterUpdate } from "svelte";
  import { data } from "../data.js";
  import { ratio, ratioMap } from "../store/stats.js";
  import { formateDate } from "../utils/formateDate.js";
  import DiagramMap from "./diagramMap.svelte";

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
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i * widthColumn, 500 - yData[i] * 5);
      ctx.lineTo((i + 1) * widthColumn, 500 - yData[i + 1] * 5);
      ctx.strokeStyle = "#C9AF4F";
      ctx.stroke();
    }
  };

  const drawAxis = ctx => {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#eee";
      ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(widthColumn, 92 * i);
      ctx.lineTo(widthCanvas * 3, 92 * i);
      ctx.strokeStyle = "#000";
      ctx.stroke();
    }
  };

  const drawTextX = ctx => {
    ctx.fillStyle = "#a6a6a6";
    for (let i = 0; i < xData.length; i++) {
      if (i % 5 === 0) {
        const date = formateDate(xData[i], "short");
        ctx.font = "14px Roboto";
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
  let prev;
  const drawPoint = e => {
    const index = findColumnIndex(e.clientX);

    if (prev === index) {
      return;
    }
    prev = index;

    ctx.clearRect(0, 0, widthCanvas * 3, 504);
    draw(ctx);

    ctx.beginPath();
    ctx.moveTo(index * widthColumn, 0);
    ctx.lineTo(index * widthColumn, 504);
     ctx.lineWidth = 0.3;
    ctx.strokeStyle = "#000";
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(index * widthColumn, 500 - yData[index] * 5, 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#C9AF4F";
    ctx.stroke();
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
    drawPoint(e);
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

    ctx.clearRect(0, 0, widthCanvas * 3, 504);
    draw(ctx);
  };
</script>

<style>
  .title {
    margin-bottom: 48px;
    font-weight: bold;
    font-size: 18px;
  }
  .chart-two {
    margin: 48px auto;
  }
  .chart {
    position: relative;
    height: 505px;
    width: 1000px;
    overflow: hidden;
  }
  .chart:hover {
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

<div class="chart-two">
  <div class="header">
    <p class="title">Diagram</p>
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
      width={widthCanvas * 3}
      height="504px"
      style="transform: translateX({currentPositionX}px);" />

    {#if tooltip}
      <div class="tooltip" style="top: 10px; left: {tooltip.x - 65}px">
        <p class="date">{tooltip.date}</p>
        <p>
          Views:
          <span class="views">{tooltip.views}</span>
        </p>
      </div>
    {/if}
  </div>

  <DiagramMap
    positionChart={positionXMap}
    on:move={moveSlider}
    columnChart={widthColumn}
    on:changeScale={handleChangeScale}
    {xData}
    {yData} />
</div>
