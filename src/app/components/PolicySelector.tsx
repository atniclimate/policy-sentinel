/** @jsxImportSource preact */

import type { SearchCriteria, Taxonomy } from "../types";

interface PolicySelectorProps {
  taxonomy: Taxonomy;
  value: SearchCriteria;
  onChange: (criteria: SearchCriteria) => void;
  error?: string;
}

export function PolicySelector({
  taxonomy,
  value,
  onChange,
  error,
}: PolicySelectorProps) {
  const selectAll = (checked: boolean) => {
    onChange({
      ...value,
      allPolicyAreas: checked,
      categoryIds: checked ? [] : value.categoryIds,
      subcategoryIds: checked ? {} : value.subcategoryIds,
    });
  };

  const selectCategory = (categoryId: string, checked: boolean) => {
    const categoryIds = checked
      ? [...new Set([...value.categoryIds, categoryId])]
      : value.categoryIds.filter((id) => id !== categoryId);
    const subcategoryIds = { ...value.subcategoryIds };
    if (!checked) delete subcategoryIds[categoryId];
    onChange({
      ...value,
      allPolicyAreas: false,
      categoryIds,
      subcategoryIds,
    });
  };

  const selectSubcategory = (
    categoryId: string,
    subcategoryId: string,
    checked: boolean,
  ) => {
    const current = value.subcategoryIds[categoryId] ?? [];
    const next = checked
      ? [...new Set([...current, subcategoryId])]
      : current.filter((id) => id !== subcategoryId);
    onChange({
      ...value,
      allPolicyAreas: false,
      categoryIds: [...new Set([...value.categoryIds, categoryId])],
      subcategoryIds: {
        ...value.subcategoryIds,
        [categoryId]: next,
      },
    });
  };

  return (
    <fieldset
      class="policy-selector"
      aria-describedby={`policy-help${error ? " policy-error" : ""}`}
    >
      <legend>Policy areas</legend>
      <p id="policy-help" class="field-hint">
        Choose All policy areas or one or more categories. Subcategories narrow
        only their parent category.
      </p>
      <label class="all-policy-option">
        <input
          type="checkbox"
          checked={value.allPolicyAreas}
          onChange={(event) => selectAll(event.currentTarget.checked)}
        />
        <span>
          <strong>All policy areas</strong>
          <small>Includes mapped, Unclassified, and other records.</small>
        </span>
      </label>
      <div class="policy-grid">
        {taxonomy.categories.map((category) => {
          const checked = value.categoryIds.includes(category.id);
          const selectedSubcategories = value.subcategoryIds[category.id] ?? [];
          return (
            <section
              class={checked ? "policy-card is-selected" : "policy-card"}
              aria-labelledby={`category-${category.id}`}
            >
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    selectCategory(category.id, event.currentTarget.checked)
                  }
                />
                <strong id={`category-${category.id}`}>{category.label}</strong>
              </label>
              <details>
                <summary>
                  Optional subcategories
                  {selectedSubcategories.length > 0 &&
                    ` (${selectedSubcategories.length} selected)`}
                </summary>
                <div class="subcategory-list">
                  {category.subcategories.map((subcategory) => (
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedSubcategories.includes(subcategory.id)}
                        onChange={(event) =>
                          selectSubcategory(
                            category.id,
                            subcategory.id,
                            event.currentTarget.checked,
                          )
                        }
                      />
                      <span>
                        <strong>{subcategory.label}</strong>
                        <small>{subcategory.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            </section>
          );
        })}
      </div>
      {error && (
        <p class="field-error" id="policy-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
