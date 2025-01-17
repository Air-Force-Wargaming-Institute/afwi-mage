from setuptools import setup, find_packages

setup(
    name="core_service",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "uvicorn",
        "python-multipart",
        "python-magic",
    ],
) 