<template>
  <div class="err-wrap">
    <div class="text-center">
      <div class="text-h1 font-weight-bold text-primary">404</div>
      <p class="text-h6 mt-2">页面不存在</p>
      <p class="text-body-2 text-medium-emphasis mb-6">你访问的页面已被移除或从未存在</p>
      <v-btn color="primary" :to="{ name: 'home' }">返回首页</v-btn>
    </div>
  </div>
</template>

<style scoped>
.err-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--v-theme-background));
}
</style>
