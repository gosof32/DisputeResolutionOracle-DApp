# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing


class DisputeResolutionOracle(gl.Contract):
    disputes: TreeMap[u256, str]
    dispute_statuses: TreeMap[u256, str]
    total_disputes: u256

    def __init__(self):
        self.disputes = TreeMap()
        self.dispute_statuses = TreeMap()
        self.total_disputes = u256(0)

    @gl.public.write
    def create_dispute(self, claim_details: str) -> u256:
        dispute_id = self.total_disputes
        self.disputes[dispute_id] = claim_details
        self.dispute_statuses[dispute_id] = "PENDING"
        self.total_disputes = u256(int(self.total_disputes) + 1)
        return dispute_id

    @gl.public.write
    def resolve_dispute(self, dispute_id: u256) -> str:
        claim_info = self.disputes[dispute_id]

        def evaluate_claim() -> typing.Any:
            task = f"""
            Analyze this claim: "{claim_info}"
            Is this claim objectively VALID or INVALID based on common knowledge and facts?
            Respond strictly in the following JSON format:
            {{
                "status": "VALID" or "INVALID"
            }}
            Do not include any extra text or formatting prefix/suffix.
            """
            
            result_str = (
                gl.nondet.exec_prompt(task)
                .replace("```json", "")
                .replace("```", "")
                .strip()
            )
            return json.loads(result_str)

        try:
            consensus_result = gl.eq_principle.strict_eq(evaluate_claim)
            final_status = str(consensus_result.get("status", "")).upper().strip()
            
            if final_status == "VALID":
                self.dispute_statuses[dispute_id] = "RESOLVED_VALID"
            elif final_status == "INVALID":
                self.dispute_statuses[dispute_id] = "RESOLVED_INVALID"
            else:
                self.dispute_statuses[dispute_id] = "ERR_INVALID_FORMAT"
                
        except Exception as err:
            error_msg = f"ERR_EXECUTION_FAILED"
            self.dispute_statuses[dispute_id] = error_msg
            return error_msg

        return self.dispute_statuses[dispute_id]

    @gl.public.view
    def get_dispute_status(self, dispute_id: u256) -> str:
        # Memastikan mengambil nilai string secara langsung
        status_val = self.dispute_statuses[dispute_id]
        return str(status_val) if status_val else "PENDING"

    @gl.public.view
    def get_dispute_claim(self, dispute_id: u256) -> str:
        claim_val = self.disputes[dispute_id]
        return str(claim_val) if claim_val else "Bitcoin was created in 2009"