from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.lesson import Lesson
from app.models.challenge import Challenge
from app.models.user import User
from app.models.dashboard import Class_
from app.services.auth_service import hash_password
import uuid

async def seed_database(db: AsyncSession):
    """Seed the database with initial lessons and challenges."""
    # Check if already seeded by checking users
    result = await db.execute(select(User).limit(1))
    if result.scalar_one_or_none():
        print("Database already seeded.")
        return
        
    # Create demo instructor user
    instructor = User(
        email="instructor@qubitlab.com",
        name="Demo Instructor",
        password_hash=hash_password("password123"),
        role="instructor"
    )
    db.add(instructor)
    await db.flush()
    
    # Create demo class
    demo_class = Class_(
        instructor_id=instructor.id,
        name="Quantum Computing 101",
        description="Introduction to Quantum Computing"
    )
    db.add(demo_class)
    
    lessons = [
        Lesson(
            module_id="fundamentals",
            title="Introduction to Qubits",
            content_md="# Introduction to Qubits\n\nIn classical computing, the fundamental unit of information is a bit, which can be either 0 or 1.\nIn quantum computing, the fundamental unit is a **qubit** (quantum bit).\n\nA qubit can exist in a state $|0\\rangle$, a state $|1\\rangle$, or a linear combination of both, known as **superposition**.\n\nThe state of a single qubit can be written as:\n$$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$$\nwhere $\\alpha$ and $\\beta$ are complex numbers such that $|\\alpha|^2 + |\\beta|^2 = 1$.",
            order_index=1,
            description="Learn the basics of quantum computing."
        ),
        Lesson(
            module_id="fundamentals",
            title="Single Qubit Gates",
            content_md="# Single Qubit Gates\n\nLearn about H, X, Y, Z gates and their effects.",
            order_index=2,
            description="Explore single qubit operations."
        ),
        Lesson(
            module_id="fundamentals",
            title="Phase Gates",
            content_md="# Phase Gates\n\nLearn about S, T, Rz gates and phase manipulation.",
            order_index=3,
            description="Manipulating the phase of qubits."
        ),
        Lesson(
            module_id="entanglement",
            title="CNOT and Entanglement",
            content_md="# CNOT and Entanglement\n\nCNOT gate, Bell states, entanglement.",
            order_index=1,
            description="Discover quantum entanglement."
        ),
        Lesson(
            module_id="entanglement",
            title="Multi-Qubit Gates",
            content_md="# Multi-Qubit Gates\n\nSWAP, Toffoli, controlled operations.",
            order_index=2,
            description="Multi-qubit quantum operations."
        ),
        Lesson(
            module_id="algorithms",
            title="Quantum Teleportation",
            content_md="# Quantum Teleportation\n\nTeleportation circuit and protocol.",
            order_index=1,
            description="Learn how to teleport quantum states."
        ),
        Lesson(
            module_id="algorithms",
            title="Deutsch-Jozsa Algorithm",
            content_md="# Deutsch-Jozsa Algorithm\n\nFirst quantum algorithm.",
            order_index=2,
            description="Explore the Deutsch-Jozsa algorithm."
        )
    ]
    db.add_all(lessons)
    
    # Challenges
    challenges = [
        Challenge(
            title="Prepare |1⟩ State",
            description="Start with |0⟩, apply gates to get |1⟩.",
            difficulty="beginner",
            points=50,
            validation_rules={"expected_output": {"1": 1.0}, "required_gates": ["X"]}
        ),
        Challenge(
            title="Create Superposition",
            description="Create equal superposition |+⟩.",
            difficulty="beginner",
            points=75,
            validation_rules={"expected_output": {"0": 0.5, "1": 0.5}, "required_gates": ["H"]}
        ),
        Challenge(
            title="Bell State",
            description="Create Bell state |Φ+⟩.",
            difficulty="intermediate",
            points=100,
            validation_rules={"expected_output": {"00": 0.5, "11": 0.5}, "required_gates": ["H", "CNOT"]}
        ),
        Challenge(
            title="GHZ State",
            description="Create 3-qubit GHZ state.",
            difficulty="intermediate",
            points=150,
            validation_rules={"expected_output": {"000": 0.5, "111": 0.5}, "required_gates": ["H", "CNOT"], "max_gates": 4}
        ),
        Challenge(
            title="Quantum Swap",
            description="Swap two qubits using only CNOT gates.",
            difficulty="advanced",
            points=200,
            validation_rules={"required_gates": ["CNOT"], "forbidden_gates": ["SWAP"], "max_gates": 3}
        )
    ]
    db.add_all(challenges)
    
    await db.commit()
    print("Database seeded successfully.")

