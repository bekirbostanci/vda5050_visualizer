<script setup lang="ts">
import { computed, ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/vue";
import { toast } from "@/components/ui/toast";

const props = defineProps<{
  title?: string;
  data?: any; // Keep for backward compatibility
  getData?: () => any; // Reactive getter function
}>();

const emit = defineEmits<{
  close: [];
}>();

// Search functionality
const searchQuery = ref("");

// Search in JSON data
const searchInJson = (json: any, query: string): any => {
  if (!query || query.trim() === "") return json;

  const searchStr = query.toLowerCase();

  // Helper function to check if a value contains the search string
  const containsSearchString = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(searchStr);
  };

  // Recursive function to filter objects and arrays
  const filterData = (data: any): any => {
    if (typeof data !== "object" || data === null) {
      return containsSearchString(data) ? data : undefined;
    }

    if (Array.isArray(data)) {
      const filteredArray = data
        .map((item) => filterData(item))
        .filter((item) => item !== undefined);
      return filteredArray.length > 0 ? filteredArray : undefined;
    }

    const filteredObj: Record<string, any> = {};
    let hasMatch = false;

    for (const key in data) {
      if (containsSearchString(key)) {
        filteredObj[key] = data[key];
        hasMatch = true;
        continue;
      }

      const filteredValue = filterData(data[key]);
      if (filteredValue !== undefined) {
        filteredObj[key] = filteredValue;
        hasMatch = true;
      }
    }

    return hasMatch ? filteredObj : undefined;
  };

  const result = filterData(json);
  return result !== undefined ? result : { message: "No matches found" };
};

// Reactive data - use getter function if provided, otherwise fall back to static data
const reactiveData = computed(() => {
  if (props.getData) {
    return props.getData();
  }
  return props.data;
});

// Computed property that returns filtered data
const filteredData = computed(() => {
  const data = reactiveData.value;
  if (!data) return null;
  return searchInJson(data, searchQuery.value);
});

const clearSearch = () => {
  searchQuery.value = "";
};

// Copy JSON to clipboard
const copyJsonToClipboard = async () => {
  const data = reactiveData.value;
  if (!data) return;

  try {
    const jsonString = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(jsonString);
    toast({
      title: "Copied to clipboard",
      description: "JSON data has been copied to your clipboard",
    });
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    toast({
      title: "Copy failed",
      description: "Failed to copy JSON to clipboard",
      variant: "destructive",
    });
  }
};
</script>

<template>
  <div class="h-full w-full border-r bg-background flex flex-col">
    <!-- Header -->
    <div
      class="p-4 border-b font-semibold flex items-center justify-between h-[68px]"
    >
      <span class="truncate">{{ title || "JSON Viewer" }}</span>
      <div class="flex items-center gap-2">
        <Button
          v-if="reactiveData"
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0"
          @click="copyJsonToClipboard"
          title="Copy JSON to clipboard"
        >
          <Icon icon="material-symbols:content-copy" class="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0"
          @click="emit('close')"
        >
          <Icon icon="material-symbols:close" class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4 json-viewer-sidebar-content">
      <div v-if="!reactiveData" class="text-muted-foreground text-center mt-10">
        No data to display
      </div>
      <div v-else class="space-y-4">
        <!-- Search Input -->
        <div class="relative">
          <Input
            v-model="searchQuery"
            placeholder="Search in JSON..."
            class="pr-8"
          />
          <Button
            v-if="searchQuery"
            variant="ghost"
            size="sm"
            class="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            @click="clearSearch"
          >
            <Icon icon="material-symbols:close" class="w-3 h-3" />
          </Button>
        </div>
        <!-- JSON Display -->
        <div class="border rounded-md p-3 bg-muted/50">
          <vue-json-pretty :data="filteredData" :deep="10" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling for light and dark mode */
.json-viewer-sidebar-content {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

.json-viewer-sidebar-content::-webkit-scrollbar {
  width: 8px;
}

.json-viewer-sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.json-viewer-sidebar-content::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.json-viewer-sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

/* Dark mode specific scrollbar styling */
.dark .json-viewer-sidebar-content {
  scrollbar-color: hsl(var(--muted-foreground) / 0.4) transparent;
}

.dark .json-viewer-sidebar-content::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.4);
}

.dark .json-viewer-sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.6);
}
</style>

<style>
/* Dark mode hover color fix for vue-json-pretty within JsonViewerSidebar */
.dark .json-viewer-sidebar-content .vjs-tree-node:hover {
  background-color: hsl(var(--muted) / 0.5) !important;
}

.dark .json-viewer-sidebar-content .vjs-tree-node:hover .vjs-key {
  color: hsl(var(--foreground)) !important;
}

.dark .json-viewer-sidebar-content .vjs-tree-node:hover .vjs-value {
  color: hsl(var(--foreground)) !important;
}
</style>
