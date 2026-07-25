"use client";

import { useEffect, useRef, useState } from "react";
import { DUMMY_DOMAIN } from "@/lib/jargon/dummy-data";
import { useJargonList } from "@/hooks/use-jargon-list";
import { CategoryChips } from "./category-chips";
import { Header } from "./header";
import { ProgressBar } from "./progress-bar";
import { SearchBar } from "./search-bar";
import { TermList } from "./term-list";
import { Toolbar } from "./toolbar";

export function JargonPage() {
  const [isDark, setIsDark] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    terms,
    categories,
    categoryCounts,
    filteredTerms,
    searchQuery,
    setSearchQuery,
    activeCategories,
    hideKnown,
    setHideKnown,
    sortMode,
    setSortMode,
    openTerms,
    knownTerms,
    toggleCategory,
    toggleOpen,
    toggleKnown,
    clearSearch,
  } = useJargonList();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className={
        isDark
          ? "dark min-h-full bg-background text-foreground"
          : "min-h-full bg-background text-foreground"
      }
    >
      <div className="mx-auto max-w-[900px] px-5 py-7 pb-20">
        <Header
          termCount={terms.length}
          categoryCount={categories.length}
          domain={DUMMY_DOMAIN}
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
          onOpenStats={() => {}}
          onOpenSettings={() => {}}
        />
        <ProgressBar known={knownTerms.size} total={terms.length} />
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
          inputRef={searchInputRef}
        />
        <CategoryChips
          categories={categories}
          counts={categoryCounts}
          totalCount={terms.length}
          activeCategories={activeCategories}
          onToggle={toggleCategory}
        />
        <Toolbar
          hideKnown={hideKnown}
          onHideKnownChange={setHideKnown}
          sortMode={sortMode}
          onSortChange={setSortMode}
          visibleCount={filteredTerms.length}
        />
        <TermList
          terms={filteredTerms}
          knownTerms={knownTerms}
          openTerms={openTerms}
          onToggleOpen={toggleOpen}
          onToggleKnown={toggleKnown}
        />
      </div>
    </div>
  );
}
