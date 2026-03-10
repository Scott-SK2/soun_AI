import sys
from pathlib import Path

# ensure inner package root is importable
sys.path.insert(0, str(Path(__file__).parent / "soun_ai"))

from soun_ai.test_concept_builder import main

if __name__ == "__main__":
     main()
