<script>
  import { onMount, afterUpdate } from "svelte";
  import { data } from "../data.js";
  import { ratio, theme } from "../store/stats.js";
  import formateDate from "../utils/formateDate.js";
  import findMaxValue from "../utils/findMaxValue.js";
  import { changeScale } from "./helpers.js";

  import Map from "./map.svelte";

  let canvasRef;
  let chartRef;

  let ctx;

  export let xData;
  export let yData;
  export let colors;
  export let title;

  let widthColumn = 30;
  let tooltip;
  let limit = 0;
  let currentPositionX = 0;
  let initialPositionX = 0;
  let isMouseDown = false;
  let positionXMap = 0;
  let offset = 0;
  let previousIndex;
  let currentColumn;
  let rightBorderMap;
  let leftBorderMap;

  const widthCanvas = xData.length * widthColumn;
  const dataArray = xData.map((val, i) => i * widthColumn);
  const dataKeys = Object.keys(yData);

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
    drawRectangle(ctx, 5);
    drawAxis(ctx);
    drawTextX(ctx);
    drawTextY(ctx);
  };

  const drawRectangle = (ctx, h) => {
    const width = h === 5 ? widthColumn : 1000 / xData.length;

    for (let i = 0; i < xData.length; i++) {
      dataKeys.map((key, index) => {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(i * width, h * 100 - yData[key][i] * h);
        ctx.lineTo((i + 1) * width, h * 100 - yData[key][i + 1] * h);
        ctx.strokeStyle = colors[index];
        ctx.stroke();
      });
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

  const drawLine = index => {
    ctx.beginPath();
    ctx.moveTo(index * widthColumn, 0);
    ctx.lineTo(index * widthColumn, 504);
    ctx.lineWidth = 0.3;
    ctx.strokeStyle = $theme === "light" ? "#000" : "#fff";
    ctx.stroke();
  };

  const drawPoint = index => {
    dataKeys.map((key, i) => {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        index * widthColumn,
        500 - yData[key][index] * 5,
        5,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = $theme === "light" ? "#C9AF4F" : "#fff";
      ctx.stroke();
    });
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
    const views = Object.keys(yData).map(key => yData[key][index]);

    tooltip = {
      ...tooltip,
      date: dateColumn,
      views
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

    const currentWidth = xData.length * widthColumn - 1000;

    if (translate >= currentWidth) {
      return -currentWidth + 10;
    }
    if (translate <= 0) {
      position = 0;
    } else {
      position = -translate;
    }

    return position;
  };

  const drawCurrenValue = e => {
    const index = findColumnIndex(e.clientX);

    if (previousIndex === index) {
      return;
    }
    previousIndex = index;

    ctx.clearRect(0, 0, widthCanvas * 3, 504);
    draw(ctx);
    drawPoint(index);
    drawLine(index);
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
      leftBorderMap = -currentPositionX / $ratio;
      rightBorderMap = (-currentPositionX + 1000) / $ratio;

      updatePositionTooltip(e);
    } else {
      renderTooltip(e);
    }
    drawCurrenValue(e);
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

    const { newRatio, position, column } = changeScale({ detail });

    widthColumn = column;
    currentPositionX = position;
    ratio.update(() => newRatio);

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
  .tooltip {
    position: absolute;
    padding: 8px 12px;
    box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0);
    border-radius: 10px;
  }

  .tooltip--light {
    background: #fff;
    border: 1px solid rgb(238, 227, 227);
    color: #000;
  }
  .tooltip--dark {
    background: #1c2533;
    border: 1px solid #1c2533;
    color: #fff;
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
    <p class="title">{title}</p>
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
      <div
        class="tooltip tooltip--{$theme}"
        style="top: 10px; left: {tooltip.x - 65}px">
        <p class="date">{tooltip.date}</p>
        <section class="info">
          {#each tooltip.views as views, i}
            <div class="views" style="color: {colors[i]}">
              {Object.keys(yData)[i]}:
              <span>{views}</span>
            </div>
          {/each}

        </section>
      </div>
    {/if}
  </div>

  <Map
    on:move={moveSlider}
    on:changeScale={handleChangeScale}
    draw={drawRectangle}
    columnChart={widthColumn}
    {rightBorderMap}
    {leftBorderMap}
    {xData}
    {yData} />

</div>
