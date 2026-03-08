from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class TrackOptions:
    event: str
    user_id: Optional[str] = None
    anonymous_id: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


@dataclass
class IdentifyOptions:
    user_id: str
    anonymous_id: Optional[str] = None
    traits: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


@dataclass
class PageOptions:
    name: Optional[str] = None
    user_id: Optional[str] = None
    anonymous_id: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


@dataclass
class GroupOptions:
    group_id: str
    user_id: Optional[str] = None
    anonymous_id: Optional[str] = None
    traits: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None
