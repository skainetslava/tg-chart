<script>
  import BarChart from "./components/barChart.svelte";
  import Diagram from "./components/diagram.svelte";
  import { theme } from "./store/stats";

  const changeTheme = () => {
    let currentTheme = $theme === "light" ? "dark" : "light";
    theme.update(() => currentTheme);
  };
</script>

<style>
  :global(html) {
    font-family: "Roboto", Arial, sans-serif;
  }
  .light {
    background: white;
    color: #000;
  }
  .dark {
    background: rgb(36, 47, 62);
    color: rgb(255, 255, 255);
  }
  .app {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .button {
    height: 48px;
    max-width: 248px;
    padding: 0 24px;
    font-size: 24px;
    border-radius: 5px;
    border: none;
    outline: none;
    cursor: pointer;
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
    margin: 24px 48px;
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
      <p>These charts are made with canvas.</p>
    </div>
    <button class="button button--{$theme}" on:click={changeTheme}>
      Switch
    </button>
  </header>
  <BarChart />
  <Diagram />
</div>
