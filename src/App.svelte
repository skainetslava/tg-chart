<script>
  import { onMount } from "svelte";
  import { data } from "./data.js";

  let canvas;

  const xData = data.columns[0].slice(1);
  const yData = data.columns[1].slice(1);

  let coors = [];
  for (let i = 0; i < xData.length; i++) {
    var dp = yData[i];
    if (i * 30 + 30 < 740) {
      coors.push(i * 30 + 30);
    }
  }

  onMount(() => {
    if (canvas.getContext) {
      var ctx = canvas.getContext("2d");

      drawRectangle(ctx);
      drawAxis(ctx);
      drawTextX(ctx);
    }
  });

  const drawRectangle = ctx => {
    for (var i = 0; i < xData.length; i++) {
      ctx.fillStyle = "#F34C44";

      let dp = yData[i];
      if (i * 30 + 30 < 740) {
        ctx.fillRect(i * 30 + 30, 500 - dp * 5 - 40, 30, dp * 5);
      }
    }
  };

  const drawAxis = ctx => {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#EAEBF3";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(30, 92 * i);
      ctx.lineTo(750, 92 * i);
      ctx.stroke();
    }
  };

  const drawTextX = ctx => {
    for (let i = 0; i < xData.length; i++) {
      if (i % 5 === 0 && i * 30 + 30 < 740) {
        ctx.fillStyle = "black";
        const date = `${new Date(xData[i]).getDate()} ${new Date(
          xData[i]
        ).toLocaleString("en", {
          month: "short"
        })}`;
        ctx.fillText(date, 30 + i * 30, 480);
      }
    }
  };

  let border;
  const handleHover = e => {
    let x = e.clientX;
    coors.forEach((cr, i) => {
      if (cr < x && x < coors[i + 1]) {
        border = cr + 1;
      }
    });
  };
</script>

<style>
  .app {
    position: relative;
    height: 464px;
    width: 800px;
	transition: 0.1s;
	overflow: hidden;
  }
  .wrapper-left {
    position: absolute;
    height: 100%;
    background: white;
    opacity: 0;
    transition: 0.1s;
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
    background: white;
    width: 100%;
    opacity: 0;
    transition: 0.1s;
  }
</style>

<div class="app" on:mousemove={handleHover} on:mouseout={null}>
  {border}
  <div class="wrapper-left" style="width: {border}px" />
  <div class="wrapper-right" style="left: {border + 30}px" />
  <canvas bind:this={canvas} class="cnvs" width="800px" height="504px" />
</div>
