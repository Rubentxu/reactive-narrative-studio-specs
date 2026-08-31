"""
Project renderer — composes the canonical project manifest + skeleton files
from a recipe bundle and user parameters.

Uses TemplateEngine.render() for all template substitution.
Returns {manifest: dict, skeleton: [{path, content}]}.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from narrative_recipes.template_engine import TemplateEngine


@dataclass
class SkeletonFile:
    """A single rendered skeleton file."""
    path: str
    content: str


@dataclass
class ProjectManifest:
    """The rendered project manifest."""
    audience: dict
    format: dict
    publishing: dict
    profiles: list[str]
    packs: list[str]
    skills: list[str]
    publishingTargets: list[str]
    initialGoals: list[str]


@dataclass
class RenderedProject:
    """A fully rendered project from a recipe."""
    manifest: dict
    skeleton: list[SkeletonFile]


class ProjectRenderer:
    """
    Renders a recipe bundle with parameters into a full project tree.

    Usage:
        renderer = ProjectRenderer()
        project = renderer.render(recipe_bundle, {"title": "My Book", ...})
    """

    def __init__(self):
        self._engine = TemplateEngine()

    def render(self, recipe_bundle: Any, parameters: dict[str, Any]) -> RenderedProject:
        """
        Render a recipe bundle with user parameters.

        Args:
            recipe_bundle: A RecipeBundle from RecipeLoader.load()
            parameters: User-supplied parameter values

        Returns:
            A RenderedProject with manifest dict and skeleton list.
        """
        # Render the manifest (narrative.yaml template)
        skeleton_files = recipe_bundle.skeleton_files

        # Find and render the narrative.yaml template
        narrative_template = skeleton_files.get("narrative.yaml", "")
        rendered_narrative = self._engine.render(narrative_template, parameters)

        # Parse the rendered narrative as YAML to build manifest
        import yaml
        manifest = yaml.safe_load(rendered_narrative)
        if manifest is None:
            manifest = {}

        # Render all skeleton files
        skeleton: list[SkeletonFile] = []
        for rel_path, template_content in skeleton_files.items():
            if rel_path == "narrative.yaml":
                content = rendered_narrative
            else:
                content = self._engine.render(template_content, parameters)
            skeleton.append(SkeletonFile(path=rel_path, content=content))

        return RenderedProject(manifest=manifest, skeleton=skeleton)
