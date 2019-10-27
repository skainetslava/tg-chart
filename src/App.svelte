<script>
  import BarChart from "./components/barChart.svelte";
  import Diagram from "./components/diagram.svelte";
  import { data } from "./data.js";

  import Lamp from "./components/lamp.svelte";
  import { theme } from "./store/stats";

  let color = "#fff";

  const xData = data.columns[0].slice(1);
  const products = {
    banans: data.columns[1].slice(1),
    oranges: data.columns[2].slice(1),
    apples: data.columns[2].slice(1)
  };
  const product = {
    banans: data.columns[1].slice(1)
  };
  const colors = Object.values(data.colors);

  const changeTheme = () => {
    let currentTheme = $theme === "light" ? "dark" : "light";
    theme.update(() => currentTheme);
    color = $theme === "light" ? "#fff" : "#FFD15C";
  };
</script>

<style>
  .light {
    background: white;
    color: #000;
    transition: 0.3s;
  }
  .dark {
    background: rgb(36, 47, 62);
    color: rgb(255, 255, 255);
    transition: 0.3s;
  }
  .app {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .button {
    display: flex;
    align-items: center;
    max-width: 248px;
    padding: 8px 32px;
    font-size: 24px;
    border-radius: 5px;
    border: none;
    outline: none;
    cursor: pointer;
    transition: 0.3s;
  }

  .button--light {
    background: rgb(36, 47, 62);
    color: #fff;
  }
  .button--dark {
    background: #fff;
    color: rgb(36, 47, 62);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    margin: 48px 84px;
  }
  .describe {
    margin: 24px;
  }
  h3 {
    font-size: 21px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  p {
    font-size: 16px;
  }
</style>

<div class="app {$theme}">
  <header>
    <div class="describe">
      <h3>Chart Contest</h3>
      <p>These charts are made with canvas and vanila javascript.</p>
    </div>
    <button class="button button--{$theme}" on:click={changeTheme}>
      <Lamp {color} />
    </button>
  </header> 
  <BarChart {xData} yData={product} {colors} title="Chart 1"/>
  <BarChart {xData} yData={products} {colors} title="Chart 2"/>
  <Diagram {xData} yData={product} {colors} title="Chart 3"/>
  <Diagram {xData} yData={products} {colors} title="Chart 4"/>
</div>
