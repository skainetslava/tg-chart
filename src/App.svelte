<script>
  import Chart from "./components/chart.svelte";
</script>

<style>
  :global(html) {
    font-family: "Roboto", Arial, sans-serif;
  }
  .app {
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .describe {
    margin-bottom: 64px;
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

<div class="app">
  <div class="describe">
    <h3>Chart Contest</h3>
    <p>These charts are made with canvas.</p>
  </div>
  <Chart />
</div>
