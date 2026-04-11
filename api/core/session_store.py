"""
In-memory session store.
Each session = one TutoringRuntime instance (per user × course).
Key: (user_id, course_id)
"""
from __future__ import annotations

import threading
from typing import Dict, Tuple

_SessionKey = Tuple[str, str]


class SessionStore:
    def __init__(self):
        self._lock = threading.Lock()
        self.sessions: Dict[_SessionKey, object] = {}

    def get(self, user_id: str, course_id: str) -> object | None:
        with self._lock:
            return self.sessions.get((user_id, course_id))

    def get_or_create(self, user_id: str, course_id: str) -> object:
        with self._lock:
            key = (user_id, course_id)
            if key not in self.sessions:
                from tutoring_engine.runtime import TutoringRuntime
                self.sessions[key] = TutoringRuntime(
                    concept_index=[],
                    user_id=user_id,
                    course_id=course_id,
                )
            return self.sessions[key]

    def delete(self, user_id: str, course_id: str) -> None:
        with self._lock:
            self.sessions.pop((user_id, course_id), None)


session_store = SessionStore()
