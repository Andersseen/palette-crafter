import { Component } from "@angular/core";

@Component({
  selector: "app-footer",
  template: `
    <footer class="mt-10 border-t border-foreground/10">
      <div class="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
        <p class="text-center text-xs opacity-50">
          Angular · Tailwind CSS · perceptual OKLCH scales, WCAG-checked
        </p>
      </div>
    </footer>
  `,
})
export default class Footer {}
